"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleCode = `const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const w = canvas.width, h = canvas.height;

// Background
ctx.fillStyle = "#0f172a";
ctx.fillRect(0, 0, w, h);

// Gradient circles
const cx = w / 2, cy = h / 2;
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const r = 80;
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${i * 30}, 80%, 60%)`;
  ctx.fill();
}

// Text
ctx.fillStyle = "#ffffff";
ctx.font = "bold 20px system-ui";
ctx.textAlign = "center";
ctx.fillText("Canvas 2D Playground", cx, h - 30);
`;

export default function CanvasPlaygroundTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [code, setCode] = useState(sampleCode);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState("");
  const doc = useMemo(() => `<!doctype html>
<html><head><style>body{margin:0;background:#0f172a;display:grid;place-items:center;min-height:100vh}
canvas{border-radius:12px;max-width:100%}</style></head>
<body><canvas id="c" width="500" height="400"></canvas>
<script>
try { ${code} } catch(e) {
  const p = document.createElement("pre");
  p.textContent = "Error: " + e.message;
  p.style.cssText = "color:#f87171;padding:16px;font-family:monospace";
  document.body.appendChild(p);
}
<\/script></body></html>`, [code]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={async () => { await sdk.copy(code); }}>复制代码</button>
        <button type="button" onClick={() => setCode(sampleCode)}>重置</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>代码</h3><p>{code.length} 字符</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} rows={16} />
        <iframe
          title="Canvas Preview"
          sandbox="allow-scripts"
          srcDoc={doc}
          style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "#0f172a" }}
        />
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">在沙箱中执行 Canvas 2D 绘图代码；使用 `canvas.getContext("2d")` API。</p>
    </section>
  );
}
