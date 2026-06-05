"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleDefinition = `class MyCounter extends HTMLElement {
  constructor() {
    super();
    this.count = 0;
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = \`
      <style>
        :host { display: inline-block; padding: 16px; border: 2px solid #6366f1; border-radius: 12px; text-align: center; font-family: system-ui; }
        button { padding: 8px 16px; margin: 0 4px; border: none; border-radius: 6px; cursor: pointer; }
        .value { font-size: 2rem; font-weight: bold; color: #6366f1; margin: 8px 0; }
      </style>
      <slot name="title">Counter</slot>
      <div class="value" id="value">0</div>
      <button id="dec">-</button>
      <button id="inc">+</button>
    \`;
    this.shadowRoot.getElementById("inc").onclick = () => this.update(++this.count);
    this.shadowRoot.getElementById("dec").onclick = () => this.update(--this.count);
  }
  update(val) {
    this.shadowRoot.getElementById("value").textContent = val;
  }
}
customElements.define("my-counter", MyCounter);`;

const sampleHtml = `<my-counter>
  <span slot="title">Count: </span>
</my-counter>`;

export default function WebComponentLabTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [definition, setDefinition] = useState(sampleDefinition);
  const [html, setHtml] = useState(sampleHtml);
  const [copied, setCopied] = useState(false);
  const iframeDoc = useMemo(() => `<!doctype html>
<html><head><style>body{font-family:system-ui;padding:20px;background:#0f172a;color:#e2e8f0;}</style></head>
<body><script>${definition}<\/script>${html}</body></html>`, [definition, html]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={async () => { await sdk.copy(iframeDoc); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "已复制" : "复制完整 HTML"}
        </button>
        <button type="button" onClick={() => { setDefinition(sampleDefinition); setHtml(sampleHtml); }}>重置</button>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>组件定义</span><textarea className="code-input" value={definition} onChange={e => setDefinition(e.target.value)} spellCheck={false} rows={12} /></label>
          <label className="tool-field"><span>使用 HTML</span><textarea className="code-input" value={html} onChange={e => setHtml(e.target.value)} spellCheck={false} rows={6} /></label>
        </div>
        <iframe
          title="Web Component Preview"
          sandbox="allow-scripts"
          srcDoc={iframeDoc}
          style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "#0f172a" }}
        />
      </div>
      <p className="tool-note">在隔离沙箱中注册 Web Component 自定义元素；Shadow DOM 提供样式封装。</p>
    </section>
  );
}
