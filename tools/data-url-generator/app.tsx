"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary);
}

export default function DataUrlGeneratorTool({ manifest }: ToolAppProps) {
  const [mimeType, setMimeType] = useState("text/plain;charset=utf-8");
  const [content, setContent] = useState("Tool Platform 工具示例");
  const [base64, setBase64] = useState(true);
  const [copied, setCopied] = useState(false);
  const dataUrl = base64
    ? "data:" + mimeType + ";base64," + encodeBase64(content)
    : "data:" + mimeType + "," + encodeURIComponent(content);
  const sourceBytes = new TextEncoder().encode(content).length;
  const modeLabel = base64 ? "Base64" : "URL 编码";

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(dataUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">编码工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>MIME Type</span>
          <input value={mimeType} onChange={(event) => { setMimeType(event.target.value); setCopied(false); }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>编码方式</span>
          <select value={base64 ? "base64" : "url"} onChange={(event) => { setBase64(event.target.value === "base64"); setCopied(false); }}>
            <option value="base64">Base64</option>
            <option value="url">URL 编码</option>
          </select>
        </label>
        <button type="button" className="button--primary" onClick={() => void copyOutput()}>
          {copied ? "已复制 Data URL" : "复制 Data URL"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>源内容</h3>
          <p>{sourceBytes} B</p>
        </article>
        <article className="detail-card">
          <h3>Data URL</h3>
          <p>{dataUrl.length} 字符</p>
        </article>
        <article className="detail-card">
          <h3>模式</h3>
          <p>{modeLabel}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>内容</span>
          <textarea value={content} onChange={(event) => { setContent(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Data URL</span>
          <textarea value={dataUrl} readOnly spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">Data URL 适合小型内联资源；过长的 Data URL 会影响可读性，也可能被浏览器、CSP 或下游系统限制。</p>
    </section>
  );
}
