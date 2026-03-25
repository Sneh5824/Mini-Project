const { v4: uuidv4 } = require("uuid");
const sm = require("./sessionManager");

// ─── Shared helper: expire + broadcast ───────────────────────────────────────
async function expireRoom(io, roomId) {
  try {
    sm.clearRoomTimer(roomId);
    await sm.deleteRoom(roomId);
    io.to(roomId).emit("room_expired", {
      message: "This room has expired. All messages and code have been permanently deleted.",
    });
  } catch (err) {
    console.error("[Socket] expireRoom error:", err.message);
  }
}

// ─── Socket module ────────────────────────────────────────────────────────────
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── join_room ────────────────────────────────────────────────────────────
    // Used by BOTH the host (after REST create) and guests
    socket.on("join_room", async ({ roomId, guestId, displayName }) => {
      try {
        const room = await sm.getRoom(roomId);
        if (!room) {
          socket.emit("room_error", { message: "Room not found or has already expired." });
          return;
        }
        if (room.status !== "active") {
          socket.emit("room_error", { message: "This room has expired." });
          return;
        }

        const hasHostRole = Boolean(room.hostId);
        const isHost = hasHostRole && room.hostId === guestId;
        const role   = isHost ? "host" : "member";

        // Remove any stale entry for this guestId (reconnect scenario)
        await sm.removeParticipant(roomId, guestId);
        await sm.addParticipant(roomId, { guestId, displayName, role, joinedAt: Date.now() });

        socket.join(roomId);
        socket.roomId      = roomId;
        socket.guestId     = guestId;
        socket.displayName = displayName;
        socket.isHost      = isHost;

        const participants = await sm.getParticipants(roomId);
        const messages     = await sm.getMessages(roomId);
        const code         = await sm.getCode(roomId);

        socket.emit("room_joined", { room, participants, messages, code, isHost });
        socket.to(roomId).emit("user_joined", { guestId, displayName, role });
        io.to(roomId).emit("participants_update", participants);

        // (Re-)arm expiry timer for host reconnects
        if (isHost) {
          const delay = room.expiresAt - Date.now();
          if (delay <= 0) {
            await expireRoom(io, roomId);
          } else {
            sm.setRoomTimer(roomId, delay, () => expireRoom(io, roomId));
          }
        }

        console.log(`[Socket] ${displayName} (${role}) joined room ${roomId}`);
      } catch (err) {
        console.error("[Socket] join_room error:", err.message);
        socket.emit("room_error", { message: "Failed to join room." });
      }
    });

    // ── send_message ─────────────────────────────────────────────────────────
    socket.on("send_message", async ({
      roomId,
      guestId,
      displayName,
      content,
      type = "text",
      attachment = null,
      replyTo = null,
    }) => {
      try {
        const trimmed = typeof content === "string" ? content.trim() : "";

        if (type === "text" && !trimmed) return;

        let safeAttachment = null;
        if (type === "attachment") {
          if (!attachment || typeof attachment !== "object") return;

          const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl : "";
          const fileName = typeof attachment.fileName === "string" ? attachment.fileName : "file";
          const mimeType = typeof attachment.mimeType === "string" ? attachment.mimeType : "application/octet-stream";
          const size = Number.isFinite(Number(attachment.size)) ? Number(attachment.size) : 0;

          // 3MB safety cap for in-memory/base64 transport
          if (!dataUrl || dataUrl.length > 3 * 1024 * 1024 * 1.5) {
            socket.emit("room_error", { message: "Attachment too large. Keep files under 3MB." });
            return;
          }

          const lowerFile = fileName.toLowerCase();
          const looksAudio = /\.(webm|ogg|wav|mp3|m4a|aac|flac)$/.test(lowerFile);
          const kind = mimeType.startsWith("image/")
            ? "image"
            : (mimeType.startsWith("audio/") || looksAudio)
              ? "audio"
              : "file";
          safeAttachment = { dataUrl, fileName, mimeType, size, kind };
        }

        const msg = {
          id:          uuidv4(),
          roomId,
          senderId:    guestId,
          senderName:  displayName,
          content:     trimmed,
          timestamp:   Date.now(),
          type,
          attachment:  safeAttachment,
          replyTo:     null,
          reactions:   {},
        };

        // Optional inline reply context shown in chat bubbles
        if (replyTo && typeof replyTo === "object") {
          msg.replyTo = {
            id: replyTo.id,
            senderName: replyTo.senderName,
            content: replyTo.content,
            type: replyTo.type || "text",
          };
        }

        await sm.addMessage(roomId, msg);
        io.to(roomId).emit("receive_message", msg);
      } catch (err) {
        console.error("[Socket] send_message error:", err.message);
      }
    });

    // ── typing_status ───────────────────────────────────────────────────────
    socket.on("typing_status", ({ roomId, guestId, displayName, isTyping }) => {
      if (!roomId || !guestId) return;
      socket.to(roomId).emit("typing_update", {
        guestId,
        displayName,
        isTyping: !!isTyping,
        ts: Date.now(),
      });
    });

    // ── toggle_reaction ─────────────────────────────────────────────────────
    socket.on("toggle_reaction", async ({ roomId, messageId, emoji, guestId }) => {
      try {
        if (!roomId || !messageId || !emoji || !guestId) return;
        const updated = await sm.toggleMessageReaction(roomId, messageId, emoji, guestId);
        if (!updated) return;
        io.to(roomId).emit("reaction_updated", updated);
      } catch (err) {
        console.error("[Socket] toggle_reaction error:", err.message);
      }
    });

    // ── code_update ──────────────────────────────────────────────────────────
    socket.on("code_update", async ({ roomId, code }) => {
      try {
        await sm.setCode(roomId, code);
        // Broadcast to everyone else in the room
        socket.to(roomId).emit("code_updated", { code });
      } catch (err) {
        console.error("[Socket] code_update error:", err.message);
      }
    });

    // ── cursor_update ───────────────────────────────────────────────────────
    socket.on("cursor_update", ({ roomId, guestId, displayName, position, selection }) => {
      if (!roomId || !guestId) return;
      socket.to(roomId).emit("cursor_updated", {
        guestId,
        displayName,
        position,
        selection,
        ts: Date.now(),
      });
    });

    // ── share_problem ────────────────────────────────────────────────────────
    socket.on("share_problem", async ({ roomId, guestId, displayName, link }) => {
      try {
        await sm.updateRoom(roomId, { problemLink: link });
        const msg = {
          id:         uuidv4(),
          roomId,
          senderId:   guestId,
          senderName: displayName,
          content:    link,
          timestamp:  Date.now(),
          type:       "problem_link",
        };
        await sm.addMessage(roomId, msg);
        io.to(roomId).emit("receive_message", msg);
        io.to(roomId).emit("problem_shared", { link, sharedBy: displayName });
      } catch (err) {
        console.error("[Socket] share_problem error:", err.message);
      }
    });

    // ── end_room (host only) ──────────────────────────────────────────────────
    socket.on("end_room", async ({ roomId, guestId }) => {
      try {
        const room = await sm.getRoom(roomId);
        if (room && room.hostId === guestId) {
          await expireRoom(io, roomId);
        } else {
          socket.emit("room_error", { message: "Only the host can end the room." });
        }
      } catch (err) {
        console.error("[Socket] end_room error:", err.message);
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      const { roomId, guestId, displayName, isHost } = socket;
      if (!roomId || !guestId) return;

      try {
        socket.to(roomId).emit("typing_update", {
          guestId,
          displayName,
          isTyping: false,
          ts: Date.now(),
        });

        socket.to(roomId).emit("cursor_removed", {
          guestId,
          displayName,
          ts: Date.now(),
        });

        await sm.removeParticipant(roomId, guestId);
        const participants = await sm.getParticipants(roomId);

        socket.to(roomId).emit("user_left", { guestId, displayName });
        io.to(roomId).emit("participants_update", participants);

        // If host disconnects, end the room
        if (isHost) {
          await expireRoom(io, roomId);
        }

        console.log(`[Socket] ${displayName} disconnected from room ${roomId}`);
      } catch (err) {
        console.error("[Socket] disconnect error:", err.message);
      }
    });
  });
};
