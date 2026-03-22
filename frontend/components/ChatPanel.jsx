import { useState, useEffect, useRef } from "react";

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

// ── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn }) {
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
          {linkify(msg.content)}
        </div>
        <div className={`flex items-center gap-1.5 mt-0.5 mx-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{formatTime(msg.timestamp)}</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>·</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{msg.senderName}</span>
        </div>
      </div>
    </div>
  );
}

// ── Chat Panel ──────────────────────────────────────────────────────────────
export default function ChatPanel({ messages = [], onSendMessage, currentGuestId }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-2 items-end" style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <textarea
          className="flex-1 blip-input resize-none min-h-[40px] max-h-[120px] py-2 leading-snug"
          rows={1}
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
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
