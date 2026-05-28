"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary);
}

export default function DataUrlGeneratorTool({ manifest }: ToolClientProps) {
  const [mimeType, setMimeType] = useState("text/plain;charset=utf-8");
  const [content, setContent] = useState("Tool Platform");
  const [base64, setBase64] = useState(true);
  const dataUrl = base64
    ? `data:${mimeType};base64,${encodeBase64(content)}`
    : `data:${mimeType},${encodeURIComponent(content)}`;

  async function copyOutput() {
    await navigator.clipboard.writeText(dataUrl);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Encoding Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>MIME Type</span>
          <input value={mimeType} onChange={(event) => setMimeType(event.target.value)} />
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={base64} onChange={(event) => setBase64(event.target.checked)} />
          <span>Base64</span>
        </label>
        <button type="button" onClick={() => void copyOutput()}>复制 Data URL</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>内容</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Data URL</span>
          <textarea value={dataUrl} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
