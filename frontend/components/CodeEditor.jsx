import { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Monaco must be loaded client-side only
const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python",     label: "Python" },
  { value: "java",       label: "Java" },
  { value: "cpp",        label: "C++" },
  { value: "typescript", label: "TypeScript" },
  { value: "go",         label: "Go" },
  { value: "rust",       label: "Rust" },
];

// Maps our language values to Piston language ids
const PISTON_LANG = {
  javascript: "javascript",
  python:     "python",
  java:       "java",
  cpp:        "c++",
  typescript: "typescript",
  go:         "go",
  rust:       "rust",
};

const PLACEHOLDERS = {
  javascript: '// Start coding...\n\nfunction solution() {\n  console.log("Hello, World!");\n}\n\nsolution();',
  python:     '# Start coding...\n\ndef solution():\n    print("Hello, World!")\n\nsolution()',
  java:       '// Start coding...\n\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  cpp:        '// Start coding...\n\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  typescript: '// Start coding...\n\nfunction solution(): void {\n  console.log("Hello, World!");\n}\n\nsolution();',
  go:         '// Start coding...\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  rust:       '// Start coding...\n\nfn main() {\n    println!("Hello, World!");\n}',
};

const MIN_OUTPUT_H = 80;
const MAX_OUTPUT_H = 500;
const DEFAULT_OUTPUT_H = 200;

// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// Drag-to-resize for output panel height
function useOutputResize(initial) {
  const [height, setHeight] = useState(initial);
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    document.body.classList.add("resizing-row");
    const onMove = (ev) => {
      const delta = startY - ev.clientY; // drag up = bigger
      setHeight(Math.min(MAX_OUTPUT_H, Math.max(MIN_OUTPUT_H, startH + delta)));
    };
    const onUp = () => {
      document.body.classList.remove("resizing-row");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [height]);
  return [height, onMouseDown];
}

export default function CodeEditor({ code, onCodeChange, readOnly = false }) {
  const [lang, setLang]           = useState("javascript");
  const [running, setRunning]     = useState(false);
  const [output, setOutput]       = useState(null);   // { stdout, stderr, exitCode, time }
  const [showOutput, setShowOutput] = useState(false);
  const [outputH, onOutputDrag]   = useOutputResize(DEFAULT_OUTPUT_H);

  const displayCode = code || PLACEHOLDERS[lang];
  const isFirstRender = useRef(true);

  const emitChange = useDebounce(onCodeChange, 300);

  const handleEditorChange = (value) => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    emitChange(value || "");
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setOutput(null);
    if (!code) onCodeChange(PLACEHOLDERS[newLang]);
  };

  const runCode = async () => {
    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
    try {
      const res = await fetch(`${backendUrl}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: PISTON_LANG[lang], code: displayCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      const run = data.run || {};
      setOutput({
        stdout:   run.stdout   || "",
        stderr:   run.stderr   || "",
        exitCode: run.exitCode ?? 0,
        time:     run.time     || null,
      });
    } catch (err) {
      setOutput({ stdout: "", stderr: err.message, exitCode: -1, time: null });
    } finally {
      setRunning(false);
    }
  };

  const hasError = output && (output.exitCode !== 0 || output.stderr);
  const outputText = output
    ? (output.stdout || "") + (output.stderr ? (output.stdout ? "\n--- stderr ---\n" : "") + output.stderr : "")
    : "";

  return (
    <div className="flex flex-col h-full" style={{ background: "#07070e" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0" style={{ background: "#0a0a14", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(255,255,255,0.22)" }}>
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.22)" }}>Editor</span>
        <div className="flex-1" />
        <select
          value={lang}
          onChange={(e) => handleLangChange(e.target.value)}
          className="text-xs rounded px-2 py-1 focus:outline-none"
          style={{ background: "#131320", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Run button */}
        <button
          onClick={runCode}
          disabled={running || readOnly}
          title={readOnly ? "Only host can run code" : "Run code (Ctrl+Enter)"}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all
            ${readOnly
              ? "cursor-not-allowed opacity-30"
              : running
                ? "cursor-wait"
                : "cursor-pointer"
            }`}
          style={readOnly
            ? { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)" }
            : running
              ? { background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", color: "#4ade80" }
              : { background: "rgba(22,163,74,0.18)", border: "1px solid rgba(22,163,74,0.35)", color: "#4ade80" }
          }
        >
          {running ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run
            </>
          )}
        </button>

        {/* Toggle output panel */}
        {output !== null && (
          <button
            onClick={() => setShowOutput((v) => !v)}
            className={`text-xs px-2 py-1 rounded border transition-colors
              ${hasError
                ? "border-red-800 text-red-400 hover:bg-red-950/30"
                : "border-green-800 text-green-400 hover:bg-green-950/30"
              }`}
          >
            {showOutput ? "Hide Output" : "Show Output"}
            {output.exitCode !== 0 && " (error)"}
          </button>
        )}
      </div>

      {/* Monaco — flex-1 takes remaining space */}
      <div className="flex-1 overflow-hidden monaco-wrapper min-h-0">
        <Monaco
          height="100%"
          language={lang === "cpp" ? "cpp" : lang}
          theme="vs-dark"
          value={displayCode}
          onChange={handleEditorChange}
          options={{
            minimap:        { enabled: false },
            fontSize:       14,
            fontFamily:     "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures:  true,
            wordWrap:       "on",
            lineNumbers:    "on",
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            readOnly,
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>

      {/* Output panel */}
      {showOutput && (
        <>
          {/* Drag handle */}
          <div
            onMouseDown={onOutputDrag}
            className="flex-shrink-0 h-2 flex items-center justify-center group cursor-row-resize transition-colors"
            style={{ background: "#0a0a14", borderTop: "1px solid rgba(255,255,255,0.055)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#0a0a14"; }}
          >
            <div className="flex gap-0.5">
              {[0,1,2].map((i) => (
                <div key={i} className="w-4 h-0.5 rounded-full transition-colors" style={{ background: "rgba(255,255,255,0.12)" }} />
              ))}
            </div>
          </div>

          {/* Output content */}
          <div
            className="flex-shrink-0 flex flex-col overflow-hidden"
            style={{ height: outputH, background: "#07070e", borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Output header */}
            <div className="flex items-center gap-2 px-4 py-1.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasError ? "bg-red-500" : "bg-green-500"}`} />
              <span className={`text-xs font-semibold ${hasError ? "text-red-400" : "text-green-400"}`}>
                {running ? "Running..." : hasError ? `Error (exit ${output.exitCode})` : "Success"}
              </span>
              {output?.time && (
                <span className="text-xs text-gray-600 ml-auto">{output.time}</span>
              )}
              <button
                onClick={() => { setShowOutput(false); setOutput(null); }}
                className="ml-auto text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
              >
                Clear
              </button>
            </div>

            {/* Output text */}
            <pre className="flex-1 overflow-auto px-4 py-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words" style={{ color: "rgba(255,255,255,0.7)" }}>
              {running ? (
                <span className="text-gray-500 italic">Executing...</span>
              ) : outputText ? (
                outputText
              ) : (
                <span className="text-gray-600 italic">No output</span>
              )}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
