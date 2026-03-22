import { useState, useEffect } from "react";

function pad(n) { return String(n).padStart(2, "0"); }

export default function Timer({ expiresAt }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSec = Math.floor(remaining / 1000);
  const hours    = Math.floor(totalSec / 3600);
  const minutes  = Math.floor((totalSec % 3600) / 60);
  const seconds  = totalSec % 60;

  const isLow      = totalSec <= 300;  // < 5 min
  const isCritical = totalSec <= 60;   // < 1 min
  const isExpired  = totalSec === 0;

  const color = isExpired
    ? "text-gray-600"
    : isCritical
    ? "text-red-400 animate-pulse-soft"
    : isLow
    ? "text-yellow-400"
    : "text-emerald-400";

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${color}`}>
      <svg
        className={`w-3.5 h-3.5 flex-shrink-0 ${isCritical && !isExpired ? "animate-pulse-soft" : ""}`}
        viewBox="0 0 16 16" fill="currentColor"
      >
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zm0 1.5v4l2.5 2.5-.88.88L7 9V4h1z" />
      </svg>
      <span>
        {hours > 0
          ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
          : `${pad(minutes)}:${pad(seconds)}`}
      </span>
    </div>
  );
}
