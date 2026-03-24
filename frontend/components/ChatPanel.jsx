import { useState, useEffect, useRef } from "react";

const QUICK_REACTIONS = ["👍", "🔥", "😂", "👏", "💡"];
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

function formatSize(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function linkify(text) {
  // Simple URL detection — for problem links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="text-red-400 underline underline-offset-2 hover:text-white break-all">
        {part}
      </a>
    ) : part
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

// ── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, onReply, onToggleReaction, currentGuestId }) {
  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs px-3 py-0.5 rounded-full italic" style={{ color: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.04)" }}>
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.type === "problem_link") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 msg-enter`}>
        <div className="max-w-[85%] rounded-xl px-4 py-3" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)" }}>
          <p className="text-xs font-medium mb-1.5 text-red-400">
            Problem shared by {msg.senderName}
          </p>
          <a
            href={msg.content}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-white underline underline-offset-2 hover:text-red-300 break-all"
          >
            {msg.content}
          </a>
        </div>
      </div>
    );
  }

  if (msg.type === "attachment") {
    const attachment = msg.attachment || {};
    const isImage = attachment.kind === "image";
    return (
      <div className={`flex items-end gap-2 mb-2 msg-enter ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {!isOwn && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mb-0.5" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
            {msg.senderName?.[0] ?? "?"}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[82%]`}>
          <div
            className={`px-3.5 py-2 rounded-2xl ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}
            style={isOwn
              ? { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff" }
              : { background: "#0e0e1c", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)" }
            }
          >
            {msg.replyTo && (
              <div
                className="mb-2 px-2 py-1 rounded-lg"
                style={{ borderLeft: "2px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.18)" }}
              >
                <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Replying to {msg.replyTo.senderName}
                </p>
                <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.62)" }}>
                  {msg.replyTo.content}
                </p>
              </div>
            )}

            {isImage ? (
              <a href={attachment.dataUrl} target="_blank" rel="noreferrer" title="Open image">
                <img
                  src={attachment.dataUrl}
                  alt={attachment.fileName || "image"}
                  className="rounded-lg max-h-[240px] object-contain"
                  style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(0,0,0,0.2)" }}
                />
              </a>
            ) : (
              <a
                href={attachment.dataUrl}
                download={attachment.fileName || "attachment"}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}
                title="Download attachment"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 012 0v8.59l2.3-2.3a1 1 0 111.4 1.42l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.42L9 10.6V2z" />
                  <path d="M3 14a1 1 0 011 1v1h12v-1a1 1 0 112 0v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 011-1z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{attachment.fileName || "attachment"}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.65)" }}>{formatSize(attachment.size || 0)}</p>
                </div>
              </a>
            )}

            {msg.content ? (
              <p className="text-sm leading-relaxed mt-2">{linkify(msg.content)}</p>
            ) : null}
          </div>

          <div className={`flex items-center gap-1.5 mt-0.5 mx-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{formatTime(msg.timestamp)}</span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>·</span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{msg.senderName}</span>
            <button
              onClick={() => onReply(msg)}
              className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.03)" }}
              title="Reply"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 mb-2 msg-enter ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Sender avatar (others only) */}
      {!isOwn && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mb-0.5" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
          {msg.senderName?.[0] ?? "?"}
        </div>
      )}
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[80%]`}>
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn ? "rounded-br-sm" : "rounded-bl-sm"
          }`}
          style={isOwn
            ? { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff" }
            : { background: "#0e0e1c", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)" }
          }
        >
          {msg.replyTo && (
            <div
              className="mb-2 px-2 py-1 rounded-lg"
              style={{
                borderLeft: "2px solid rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
                Replying to {msg.replyTo.senderName}
              </p>
              <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.62)" }}>
                {msg.replyTo.content}
              </p>
            </div>
          )}
          {linkify(msg.content)}
        </div>
        <div className={`flex items-center gap-1.5 mt-0.5 mx-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{formatTime(msg.timestamp)}</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>·</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{msg.senderName}</span>
        </div>

        {msg.type === "text" && (
          <div className={`flex items-center flex-wrap gap-1 mt-1 mx-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(msg.reactions || {}).map(([emoji, users]) => {
              const reacted = Array.isArray(users) && users.includes(currentGuestId);
              const count = Array.isArray(users) ? users.length : 0;
              if (!count) return null;
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(msg.id, emoji)}
                  className="text-[11px] px-1.5 py-0.5 rounded-md transition-colors"
                  style={reacted
                    ? { background: "rgba(220,38,38,0.22)", border: "1px solid rgba(220,38,38,0.4)", color: "#fff" }
                    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)", color: "rgba(255,255,255,0.72)" }
                  }
                  title="Toggle reaction"
                >
                  {emoji} {count}
                </button>
              );
            })}

            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={`${msg.id}-${emoji}`}
                onClick={() => onToggleReaction(msg.id, emoji)}
                className="text-[11px] px-1.5 py-0.5 rounded-md transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.18)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}

            <button
              onClick={() => onReply(msg)}
              className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.03)" }}
              title="Reply"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chat Panel ──────────────────────────────────────────────────────────────
export default function ChatPanel({
  messages = [],
  onSendMessage,
  currentGuestId,
  onTypingChange = () => {},
  typingUsers = [],
  onToggleReaction = () => {},
}) {
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [attachErr, setAttachErr] = useState("");
  const bottomRef = useRef(null);
  const typingRef = useRef(false);
  const idleTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (typingRef.current) onTypingChange(false);
    };
  }, [onTypingChange]);

  const setTyping = (next) => {
    if (typingRef.current === next) return;
    typingRef.current = next;
    onTypingChange(next);
  };

  const onTextChange = (value) => {
    setText(value);
    if (!value.trim()) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setTyping(false);
      return;
    }

    setTyping(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setTyping(false), 1200);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;
    const replyTo = replyTarget
      ? {
          id: replyTarget.id,
          senderName: replyTarget.senderName,
          content: replyTarget.content,
          type: replyTarget.type,
        }
      : null;

    if (pendingAttachment) {
      onSendMessage({
        type: "attachment",
        content: trimmed,
        attachment: pendingAttachment,
      }, replyTo);
    } else {
      onSendMessage(trimmed, replyTo);
    }

    setText("");
    setReplyTarget(null);
    setPendingAttachment(null);
    setAttachErr("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setTyping(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePickAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachErr("File too large. Max 3MB.");
      setPendingAttachment(null);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingAttachment({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        kind: file.type.startsWith("image/") ? "image" : "file",
      });
      setAttachErr("");
    } catch (err) {
      setAttachErr(err.message || "Unable to read selected file.");
      setPendingAttachment(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.18)" }}>No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === currentGuestId}
              currentGuestId={currentGuestId}
              onToggleReaction={onToggleReaction}
              onReply={(sourceMsg) => setReplyTarget(sourceMsg)}
            />
          ))
        )}

        {typingUsers.length > 0 && (
          <div className="px-1 pb-2">
            <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.34)" }}>
              {typingUsers.slice(0, 2).map((u) => u.displayName).join(", ")}
              {typingUsers.length > 2 ? ` +${typingUsers.length - 2} others` : ""} typing...
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-2 items-end" style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <div className="flex-1 flex flex-col gap-2">
          {replyTarget && (
            <div
              className="px-3 py-2 rounded-lg text-xs flex items-start justify-between gap-3"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <div className="min-w-0">
                <p className="font-semibold text-red-400">Replying to {replyTarget.senderName}</p>
                <p className="truncate" style={{ color: "rgba(255,255,255,0.72)" }}>{replyTarget.content}</p>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.45)" }}
                title="Cancel reply"
              >
                Cancel
              </button>
            </div>
          )}

          {pendingAttachment && (
            <div
              className="px-3 py-2 rounded-lg text-xs flex items-start justify-between gap-3"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.28)" }}
            >
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: "#93c5fd" }}>
                  {pendingAttachment.kind === "image" ? "Image ready" : "File ready"}
                </p>
                <p className="truncate" style={{ color: "rgba(255,255,255,0.72)" }}>
                  {pendingAttachment.fileName} ({formatSize(pendingAttachment.size)})
                </p>
              </div>
              <button
                onClick={() => {
                  setPendingAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.45)" }}
                title="Remove attachment"
              >
                Remove
              </button>
            </div>
          )}

          {attachErr && (
            <p className="text-[11px]" style={{ color: "#fca5a5" }}>{attachErr}</p>
          )}

        <textarea
          className="flex-1 blip-input resize-none min-h-[40px] max-h-[120px] py-2 leading-snug"
          rows={1}
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKey}
        />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handlePickAttachment}
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.json,.csv,.zip,.rar,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-2.5 rounded-lg flex-shrink-0 self-end transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)" }}
          title="Attach file/image"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.6 13.4a3 3 0 004.24 0l3.18-3.18a3 3 0 00-4.24-4.24l-3.53 3.54a1 1 0 101.41 1.41l3.54-3.53a1 1 0 111.41 1.41l-3.18 3.18a1 1 0 01-1.41 0L6.48 8.48a3 3 0 114.24-4.24l.35.35a1 1 0 101.41-1.41l-.35-.35A5 5 0 105.07 9.9l3.53 3.5z" />
          </svg>
        </button>

        <button
          onClick={handleSend}
          disabled={!text.trim() && !pendingAttachment}
          className="px-3 py-2.5 rounded-lg flex-shrink-0 self-end transition-all disabled:opacity-30"
          style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff" }}
          title="Send"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
