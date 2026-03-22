import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { destroySocket } from "../lib/socket";

/* ── Deterministic seeded RNG — same output on server + client ── */
function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 4294967296; };
}

function buildParticles(count) {
  const r    = seededRand(0xb00b1e55);
  const cols = ["#f59e0b","#fcd34d","#dc2626","#ef4444","#ffffff","#fbbf24","#b45309","#f97316","#a78bfa","#fb923c","#93c5fd","#86efac"];
  return Array.from({ length: count }, (_, i) => {
    const angle = r() * Math.PI * 2;
    const dist  = 90 + r() * 390;
    const wave  = r() * 0.7;
    const dur   = 0.65 + r() * 1.4;
    const tx    = Math.cos(angle) * dist + (r() - 0.5) * 150;
    const ty    = Math.sin(angle) * dist + (r() - 0.5) * 150;
    const color = cols[Math.floor(r() * cols.length)];
    const rot   = r() * 720 - 360;
    const type  = r() > 0.7 ? "streak" : "dot";
    const w     = type === "streak" ? (8 + r() * 16) : (2 + r() * 5);
    const h     = type === "streak" ? (1 + r() * 2)  : w;
    const br    = type === "streak" ? "2px" : "50%";
    return { i, w, h, wave, dur, tx, ty, color, rot, br };
  });
}

const PARTICLES    = buildParticles(200);
const ENERGY_RINGS = [0, 0.06, 0.14, 0.25];  /* staggered ring delays */
const STONES_CFG   = [
  {cx:28, cy:80, fill:"#3b82f6", id:"ss0"},  /* Space  — blue   */
  {cx:55, cy:80, fill:"#eab308", id:"ss1"},  /* Mind   — yellow */
  {cx:82, cy:80, fill:"#ef4444", id:"ss2"},  /* Reality — red   */
  {cx:28, cy:97, fill:"#a855f7", id:"ss3"},  /* Power  — purple */
  {cx:55, cy:97, fill:"#f97316", id:"ss4"},  /* Soul   — orange */
  {cx:82, cy:97, fill:"#22c55e", id:"ss5"},  /* Time   — green  */
];

/* ── Per-vibe message pools ── */
const CODING_LINES = [
  { h: "Session expired.",      c: "Just like your debugging patience." },
  { h: "Process terminated.",   c: "Exit code: Blip." },
  { h: "Room destroyed.",       c: "Memory leak successfully prevented." },
  { h: "Room timed out.",       c: "Stack overflow: avoided." },
  { h: "Garbage collected.",    c: "This room has been freed from memory." },
  { h: "Half the bugs remain.", c: "The room does not." },
  { h: "Connection closed.",    c: "Your unfinished code lives on in shame." },
  { h: "This room is dust.",    c: "The timer snapped. No survivors." },
];
const CHAT_LINES = [
  { h: "Perfectly balanced.",       c: "As all things should be. Room blipped." },
  { h: "You've been blipped.",      c: "Congratulations. The room is gone." },
  { h: "Reality has been reset.",   c: "All data erased. No trace. No echo." },
  { h: "The room vanished.",        c: "The universe blinked. You felt nothing." },
  { h: "Room: blipped.",            c: "Perfectly balanced, as all things should be." },
  { h: "The void claimed it.",      c: "Everything ends. Even this chat." },
  { h: "And just like that...",     c: "The room faded into the void." },
  { h: "No room. No trace.",        c: "Half the chats remain. This one does not." },
];
const FALLBACK = { h: "Reality has been reset.", c: "All data erased.\u2005No trace.\u2005No echo." };

/* ── Infinity Gauntlet SVG — v2 ── */
function Gauntlet({ snapped }) {
  return (
    <svg viewBox="0 0 110 150" className="snap-svg">
      <defs>
        {/* ── Gold gradients — 3 depth levels ── */}
        <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fef3c7"/>
          <stop offset="30%"  stopColor="#fbbf24"/>
          <stop offset="70%"  stopColor="#d97706"/>
          <stop offset="100%" stopColor="#7c2d12"/>
        </linearGradient>
        <linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fde68a"/>
          <stop offset="50%"  stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#92400e"/>
        </linearGradient>
        <linearGradient id="cg3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fcd34d"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>
        {/* ── Depth shading overlay ── */}
        <linearGradient id="cg-depth" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.14)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.38)"/>
        </linearGradient>
        {/* ── Side-edge shadow ── */}
        <linearGradient id="cg-edge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.35)"/>
          <stop offset="12%"  stopColor="transparent"/>
          <stop offset="88%"  stopColor="transparent"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)"/>
        </linearGradient>
        {/* ── Stone glow filters ── */}
        {STONES_CFG.map(({id}) => (
          <filter key={id} id={id} x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
      </defs>

      {/* ═══ BRACER / CUFF ═══ */}
      <rect x="16" y="116" width="78" height="29" rx="9"  fill="url(#cg3)"/>
      <rect x="16" y="116" width="78" height="29" rx="9"  fill="url(#cg-depth)" opacity="0.75"/>
      <rect x="16" y="116" width="78" height="29" rx="9"  fill="url(#cg-edge)"/>
      {/* Highlight strip */}
      <rect x="20" y="118" width="70" height="5.5" rx="2.5" fill="rgba(255,255,255,0.22)"/>
      {/* Cuff ridge */}
      <rect x="16" y="130" width="78" height="1.5" rx="0.7" fill="rgba(0,0,0,0.22)"/>
      <rect x="22" y="133" width="66" height="5.5" rx="2.5" fill="rgba(0,0,0,0.14)"/>

      {/* ═══ PALM PLATE ═══ */}
      <rect x="12" y="63" width="86" height="57" rx="11" fill="url(#cg2)"/>
      <rect x="12" y="63" width="86" height="57" rx="11" fill="url(#cg-depth)" opacity="0.6"/>
      <rect x="12" y="63" width="86" height="57" rx="11" fill="url(#cg-edge)" opacity="0.75"/>
      {/* Palm highlight */}
      <rect x="16" y="65" width="78" height="8"   rx="4"  fill="rgba(255,255,255,0.19)"/>
      {/* Palm inner panel line */}
      <rect x="14" y="105" width="82" height="1.5" rx="0.7" fill="rgba(0,0,0,0.18)"/>

      {/* ═══ FINGERS ═══ */}
      {/* Helper: each finger = base color + depth + highlight strip + knuckle joint */}
      {/* Pinky — shortest, rightmost */}
      <rect x="75" y="22" width="15" height="46" rx="7" fill="url(#cg1)"/>
      <rect x="75" y="22" width="15" height="46" rx="7" fill="url(#cg-depth)"/>
      <rect x="76" y="24" width="13" height="5"  rx="2" fill="rgba(255,255,255,0.24)"/>
      <rect x="75" y="44" width="15" height="2.5" rx="1" fill="rgba(0,0,0,0.22)"/>
      {/* Ring */}
      <rect x="59" y="14" width="15" height="54" rx="7" fill="url(#cg1)"/>
      <rect x="59" y="14" width="15" height="54" rx="7" fill="url(#cg-depth)"/>
      <rect x="60" y="16" width="13" height="5"  rx="2" fill="rgba(255,255,255,0.24)"/>
      <rect x="59" y="36" width="15" height="2.5" rx="1" fill="rgba(0,0,0,0.22)"/>
      {/* Middle — tallest */}
      <rect x="45" y="8"  width="15" height="60" rx="7" fill="url(#cg1)"/>
      <rect x="45" y="8"  width="15" height="60" rx="7" fill="url(#cg-depth)"/>
      <rect x="46" y="10" width="13" height="5"  rx="2" fill="rgba(255,255,255,0.24)"/>
      <rect x="45" y="30" width="15" height="2.5" rx="1" fill="rgba(0,0,0,0.22)"/>
      {/* Index */}
      <rect x="29" y="14" width="15" height="54" rx="7" fill="url(#cg1)"/>
      <rect x="29" y="14" width="15" height="54" rx="7" fill="url(#cg-depth)"/>
      <rect x="30" y="16" width="13" height="5"  rx="2" fill="rgba(255,255,255,0.24)"/>
      <rect x="29" y="36" width="15" height="2.5" rx="1" fill="rgba(0,0,0,0.22)"/>
      {/* Thumb — rotated, left side */}
      <rect x="6"  y="52" width="14" height="32" rx="7" fill="url(#cg1)" transform="rotate(-23 13 68)"/>
      <rect x="6"  y="52" width="14" height="32" rx="7" fill="url(#cg-depth)" transform="rotate(-23 13 68)"/>
      <rect x="7"  y="54" width="12" height="4.5" rx="2" fill="rgba(255,255,255,0.22)" transform="rotate(-23 13 68)"/>

      {/* ═══ KNUCKLE ARMOR PLATE ═══ */}
      <rect x="27" y="62" width="69" height="7"  rx="3.5" fill="rgba(0,0,0,0.25)"/>
      <rect x="27" y="62" width="69" height="3.5" rx="1.7" fill="rgba(0,0,0,0.1)"/>

      {/* ═══ INFINITY STONES ═══ */}
      {STONES_CFG.map(({cx, cy, fill, id}, idx) => (
        <g key={id}>
          {/* Deep bezel / setting ring */}
          <circle cx={cx} cy={cy} r="9.5" fill="rgba(0,0,0,0.5)"/>
          <circle cx={cx} cy={cy} r="8.2" fill="rgba(0,0,0,0.25)"/>
          {/* Gem — charge animation via CSS var */}
          <circle
            cx={cx} cy={cy} r="7"
            fill={fill}
            filter={`url(#${id})`}
            className="snap-stone-gem"
            style={{"--stone-delay": `${0.4 + idx * 0.07}s`}}
          />
          {/* Primary specular */}
          <circle cx={cx - 2.4} cy={cy - 2.8} r="2.6" fill="rgba(255,255,255,0.68)"/>
          {/* Secondary micro-highlight */}
          <circle cx={cx + 1.8} cy={cy + 1.5} r="1.1" fill="rgba(255,255,255,0.32)"/>
        </g>
      ))}

      {/* ═══ SNAP SPARK — mounts when snapped ═══ */}
      {snapped && (
        <g className="snap-spark-burst">
          {/* Central bloom */}
          <circle cx="36" cy="25" r="5" fill="white" className="snap-spark-bloom"
            style={{transformOrigin:"36px 25px"}}/>
          {/* 8 radial rays */}
          {[0,45,90,135,180,225,270,315].map((deg, k) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={k}
                x1="36" y1="25"
                x2={36 + Math.cos(rad) * 12}
                y2={25 + Math.sin(rad) * 12}
                stroke={k % 2 === 0 ? "#fff" : "#fbbf24"}
                strokeWidth="1.4"
                strokeLinecap="round"
                className="snap-spark-ray"
                style={{"--ray-delay": `${k * 0.018}s`, transformOrigin:"36px 25px"}}
              />
            );
          })}
          {/* Outer halo ring */}
          <circle cx="36" cy="25" r="9" fill="none" stroke="rgba(251,191,36,0.6)" strokeWidth="1"
            className="snap-spark-halo" style={{transformOrigin:"36px 25px"}}/>
        </g>
      )}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */
export default function SnapExpired({ roomType }) {
  const router  = useRouter();
  const [snapped,  setSnapped]  = useState(false);
  const [showBtn,  setShowBtn]  = useState(false);
  const [msg,      setMsg]      = useState(FALLBACK);

  useEffect(() => {
    const pool = roomType === "coding" ? CODING_LINES : CHAT_LINES;
    setMsg(pool[Math.floor(Math.random() * pool.length)]);
    const t1 = setTimeout(() => setSnapped(true),  1000);
    const t2 = setTimeout(() => setShowBtn(true),  4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [roomType]);

  const goHome = () => { destroySocket(); router.push("/"); };

  return (
    <div className={`snap-root${snapped ? " snap-root--shook" : ""}`}>

      {/* Ambient pulse rings */}
      <div className="snap-ring snap-ring-1" />
      <div className="snap-ring snap-ring-2" />

      {/* Multi-color flash — CSS-timed at 1.0s */}
      <div className="snap-flash" />

      {/* Energy expansion rings — mount on snap */}
      {snapped && ENERGY_RINGS.map((d, k) => (
        <div
          key={k}
          className="snap-energy-ring"
          style={{
            animationDelay: `${d}s`,
            borderColor: ["#fbbf24","#ef4444","#a855f7","#3b82f6"][k],
          }}
        />
      ))}

      {/* Dust particles */}
      {PARTICLES.map(({ i, w, h, wave, dur, tx, ty, color, rot, br }) => (
        <div
          key={i}
          className="snap-dust"
          style={{
            width:  w,
            height: h,
            background:   color,
            borderRadius: br,
            animationDelay:    `${1.3 + wave}s`,
            animationDuration: `${dur}s`,
            "--snap-tx":  `${tx}px`,
            "--snap-ty":  `${ty}px`,
            "--snap-rot": `${rot}deg`,
          }}
        />
      ))}

      {/* Gauntlet — 3 chained CSS animations + spark on snap */}
      <div className="snap-gauntlet-shell">
        <div className="snap-charge-sweep" />
        <Gauntlet snapped={snapped} />
      </div>

      {/* Text */}
      <div className="snap-text-block">
        <span className="snap-eyebrow">B&thinsp;L&thinsp;I&thinsp;P</span>
        <h1 className="snap-headline">
          {msg.h.split("").map((ch, i) => (
            <span
              key={i}
              className="snap-ch"
              style={{ animationDelay: `${2.5 + i * 0.04}s` }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h1>
        <p className="snap-caption" style={{ animationDelay: `${2.6 + msg.h.length * 0.04 + 0.3}s` }}>
          {msg.c}
        </p>
      </div>

      {showBtn && (
        <button onClick={goHome} className="snap-return-btn">
          ← Return to reality
        </button>
      )}
    </div>
  );
}