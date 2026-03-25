require("dotenv").config();
const express = require("express");
const http    = require("http");
const cors    = require("cors");
const { Server } = require("socket.io");
const sm = require("./sessionManager");
const redis = require("./redisClient");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

const SYSTEM_PUBLIC_ROOM_SPECS = [
  { roomId: "PUB10M", timeout: 10 },
  { roomId: "PUB20M", timeout: 20 },
];

// ─── REST API ────────────────────────────────────────────────────────────────

// POST /api/rooms  — create a new room
app.post("/api/rooms", async (req, res) => {
  try {
    const { guestId, displayName, roomType, timeout, roomName, visibility = "private" } = req.body;
    if (!guestId || !displayName || !roomType || !timeout) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (roomName && typeof roomName === "string" && roomName.trim().length > 40) {
      return res.status(400).json({ error: "Room name too long (max 40 characters)." });
    }
    const validTypes    = ["chat", "coding"];
    const validTimeouts = [10, 20, 30, 60];
    const validVisibility = ["private"];
    if (!validTypes.includes(roomType))    return res.status(400).json({ error: "Invalid roomType." });
    if (!validTimeouts.includes(timeout))  return res.status(400).json({ error: "Invalid timeout." });
    if (!validVisibility.includes(visibility)) return res.status(400).json({ error: "Invalid room visibility." });

    if (visibility !== "private") return res.status(400).json({ error: "Public rooms are system-managed only." });

    const hostId = guestId;
    const hostName = displayName;

    const room = await sm.createRoom({
      hostId,
      hostName,
      roomType,
      timeout,
      visibility,
      roomName: (roomName && roomName.trim()) || null,
    });

    // Arm the expiry timer immediately
    const delay = room.expiresAt - Date.now();
    sm.setRoomTimer(room.roomId, delay, () => {
      // io is available via closure
      expireRoomREST(io, room.roomId);
    });

    console.log(`[API] Room ${room.roomId} created by ${displayName} (${roomType}, ${timeout}m)`);
    res.status(201).json(room);
  } catch (err) {
    console.error("[API] POST /api/rooms error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/rooms/:roomId  — check room existence / get metadata
app.get("/api/rooms/:roomId", async (req, res) => {
  try {
    const room = await sm.getRoom(req.params.roomId.toUpperCase());
    if (!room) return res.status(404).json({ error: "Room not found or has expired." });
    // Don't expose full participant list here — use socket for that
    res.json({
      roomId:    room.roomId,
      roomType:  room.roomType,
      visibility: room.visibility || "private",
      roomName:  room.roomName || null,
      timeout:   room.timeout,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      status:    room.status,
    });
  } catch (err) {
    console.error("[API] GET /api/rooms/:roomId error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/public-rooms  — list active public rooms
app.get("/api/public-rooms", async (_req, res) => {
  try {
    const roomKeys = SYSTEM_PUBLIC_ROOM_SPECS.map((s) => `room:${s.roomId}`);
    const roomsRaw = await redis.mGet(roomKeys);
    const now = Date.now();
    const publicRooms = [];

    for (const raw of roomsRaw) {
      if (!raw) continue;
      const room = JSON.parse(raw);
      if (!room || room.status !== "active") continue;
      if ((room.visibility || "private") !== "public") continue;
      if (Number(room.expiresAt || 0) <= now) continue;

      const participants = await sm.getParticipants(room.roomId);
      publicRooms.push({
        roomId: room.roomId,
        roomName: room.roomName || null,
        roomType: room.roomType,
        visibility: "public",
        timeout: room.timeout,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        participantCount: participants.length,
      });
    }

    publicRooms.sort((a, b) => a.timeout - b.timeout);
    res.json({ rooms: publicRooms });
  } catch (err) {
    console.error("[API] GET /api/public-rooms error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

async function ensureSystemPublicRoom(io, spec) {
  const existing = await sm.getRoom(spec.roomId);
  const now = Date.now();

  if (!existing || existing.status !== "active" || Number(existing.expiresAt || 0) <= now) {
    if (existing) {
      sm.clearRoomTimer(spec.roomId);
      await sm.deleteRoom(spec.roomId);
      io.to(spec.roomId).emit("room_expired", {
        message: "This room has expired. A fresh public room has been started.",
      });
    }

    const room = await sm.createRoom({
      roomId: spec.roomId,
      hostId: null,
      hostName: null,
      roomType: "chat",
      timeout: spec.timeout,
      visibility: "public",
      roomName: null,
    });

    const delay = room.expiresAt - Date.now();
    sm.setRoomTimer(spec.roomId, delay, async () => {
      await ensureSystemPublicRoom(io, spec);
    });
    return;
  }

  const delay = Number(existing.expiresAt || 0) - now;
  sm.setRoomTimer(spec.roomId, delay, async () => {
    await ensureSystemPublicRoom(io, spec);
  });
}

async function initializeSystemPublicRooms(io) {
  for (const spec of SYSTEM_PUBLIC_ROOM_SPECS) {
    await ensureSystemPublicRoom(io, spec);
  }
}

// ─── Helper (mirrors socket.js expireRoom but used by REST timer) ─────────────
async function expireRoomREST(io, roomId) {
  try {
    sm.clearRoomTimer(roomId);
    await sm.deleteRoom(roomId);
    io.to(roomId).emit("room_expired", {
      message: "This room has expired. All messages and code have been permanently deleted.",
    });
    console.log(`[Server] Room ${roomId} expired and deleted.`);
  } catch (err) {
    console.error("[Server] expireRoomREST error:", err.message);
  }
}

// ─── Code execution (local child_process) ────────────────────────────────────
const { spawnSync } = require("child_process");
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const crypto = require("crypto");

const EXEC_TIMEOUT = 10000; // 10 seconds

function execCode(language, code, stdin = "") {
  const id     = crypto.randomBytes(8).toString("hex");
  const tmpDir = os.tmpdir();
  let stdout = "", stderr = "", exitCode = 0;
  const tempFiles = [];

  function tmp(ext) {
    const f = path.join(tmpDir, `blip_${id}${ext}`);
    tempFiles.push(f);
    return f;
  }
  function cleanup() {
    tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
  }
  function run(cmd, args, options = {}) {
    const r = spawnSync(cmd, args, { timeout: EXEC_TIMEOUT, encoding: "utf8", ...options });
    return {
      stdout:   r.stdout || "",
      stderr:   r.stderr || (r.error ? r.error.message : ""),
      exitCode: r.status ?? (r.error ? -1 : 0),
      timedOut: r.signal === "SIGTERM" || (r.error && r.error.code === "ETIMEDOUT"),
    };
  }

  try {
    if (language === "javascript") {
      const f = tmp(".js");
      fs.writeFileSync(f, code);
      const r = run("node", [f], { input: stdin });
      stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
      if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }

    } else if (language === "python") {
      const f = tmp(".py");
      fs.writeFileSync(f, code);
      // Try "python" first, then "python3"
      let r = run("python", [f], { input: stdin });
      if (r.exitCode === -1 && r.stderr.includes("not recognized")) r = run("python3", [f], { input: stdin });
      stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
      if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }

    } else if (language === "typescript") {
      const f = tmp(".ts");
      fs.writeFileSync(f, code);
      const r = run("npx", ["--yes", "ts-node", "--skipProject", f], { shell: true, input: stdin });
      stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
      if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }

    } else if (language === "go") {
      const f = tmp(".go");
      fs.writeFileSync(f, code);
      const r = run("go", ["run", f], { input: stdin });
      stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
      if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }

    } else if (language === "java") {
      // Java: file must be named after the public class (use Solution)
      const f = path.join(tmpDir, "Solution.java");
      tempFiles.push(f);
      fs.writeFileSync(f, code);
      const compile = run("javac", [f]);
      if (compile.exitCode !== 0) {
        stdout = ""; stderr = compile.stderr; exitCode = compile.exitCode;
      } else {
        const classFile = path.join(tmpDir, "Solution.class");
        tempFiles.push(classFile);
        const r = run("java", ["-cp", tmpDir, "Solution"], { input: stdin });
        stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
        if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }
      }

    } else if (language === "c++") {
      const src = tmp(".cpp");
      const out = tmp(process.platform === "win32" ? ".exe" : ".out");
      fs.writeFileSync(src, code);
      const compile = run("g++", [src, "-o", out]);
      if (compile.exitCode !== 0) {
        stdout = ""; stderr = compile.stderr; exitCode = compile.exitCode;
      } else {
        const r = run(out, [], { input: stdin });
        stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
        if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }
      }

    } else if (language === "rust") {
      const src = tmp(".rs");
      const out = tmp(process.platform === "win32" ? ".exe" : ".out");
      fs.writeFileSync(src, code);
      const compile = run("rustc", [src, "-o", out]);
      if (compile.exitCode !== 0) {
        stdout = ""; stderr = compile.stderr; exitCode = compile.exitCode;
      } else {
        const r = run(out, [], { input: stdin });
        stdout = r.stdout; stderr = r.stderr; exitCode = r.exitCode;
        if (r.timedOut) { stderr = "Execution timed out (10s)"; exitCode = -1; }
      }

    } else {
      stderr = `Language "${language}" is not supported.`;
      exitCode = -1;
    }
  } finally {
    cleanup();
  }

  return { stdout, stderr, exitCode };
}

app.post("/api/run", (req, res) => {
  const { language, code, stdin = "" } = req.body;
  if (!language || !code) return res.status(400).json({ error: "Missing language or code." });
  try {
    const start  = Date.now();
    const result = execCode(language, code, String(stdin));
    result.time  = `${Date.now() - start}ms`;
    res.json({ run: result });
  } catch (err) {
    console.error("[API] /api/run error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// ─── Socket.IO ────────────────────────────────────────────────────────────────
require("./socket")(io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, async () => {
  try {
    await initializeSystemPublicRooms(io);
  } catch (err) {
    console.error("[Server] Failed to initialize system public rooms:", err.message);
  }
  console.log(`[Server] Blip backend running on http://localhost:${PORT}`);
});
