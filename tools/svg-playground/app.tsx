"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleSvg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="#0f172a" rx="16" />
  <circle cx="200" cy="120" r="60" fill="url(#grad)" opacity="0.9" />
  <rect x="140" y="200" width="120" height="40" rx="8" fill="#22d3ee" opacity="0.8" />
  <text x="200" y="90" text-anchor="middle" fill="#ffffff" font-size="14">SVG Playground</text>
</svg>`;

export default function SvgPlaygroundTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [svg, setSvg] = useState(sampleSvg);
  const [copied, setCopied] = useState(false);
  const iframeDoc = useMemo(() => `<!doctype html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0f172a">${svg}</body></html>`, [svg]);

  async function downloadSvg() {
    await sdk.download("preview.svg", svg, "image/svg+xml");
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={downloadSvg}>下载 SVG</button>
        <button type="button" onClick={async () => { await sdk.copy(svg); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "已复制" : "复制代码"}
        </button>
        <button type="button" onClick={() => setSvg(sampleSvg)}>重置</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>SVG 大小</h3><p>{svg.length} 字符</p></article>
        <article className="detail-card"><h3>预览</h3><p>iframe 沙箱</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={svg} onChange={e => setSvg(e.target.value)} spellCheck={false} rows={16} />
        <iframe
          title="SVG Preview"
          sandbox="allow-scripts"
          srcDoc={iframeDoc}
          style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "#0f172a" }}
        />
      </div>
      <p className="tool-note">SVG 在隔离沙箱中渲染，确保安全性；支持任意标准 SVG 元素。</p>
    </section>
  );
}
