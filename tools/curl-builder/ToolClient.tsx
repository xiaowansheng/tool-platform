"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function shellQuote(value: string) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function parseHeaders(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export default function CurlBuilderTool({ manifest }: ToolClientProps) {
  const [method, setMethod] = useState("POST");
  const [url, setUrl] = useState("https://api.example.com/tools");
  const [headers, setHeaders] = useState("Content-Type: application/json\nAuthorization: Bearer TOKEN");
  const [body, setBody] = useState('{"name":"JSON Formatter"}');
  const [copied, setCopied] = useState(false);
  const headerLines = parseHeaders(headers);
  const hasBody = body.trim() !== "" && method !== "GET";
  const command = [
    "curl",
    "-X",
    method,
    shellQuote(url),
    ...headerLines.flatMap((header) => ["-H", shellQuote(header)]),
    hasBody ? "-d" : "",
    hasBody ? shellQuote(body) : ""
  ].filter(Boolean).join(" \\\n  ");

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
  }

  function markChanged(callback: (value: string) => void, value: string) {
    callback(value);
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API 调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>HTTP 方法</span>
          <select value={method} onChange={(event) => { setMethod(event.target.value); setCopied(false); }}>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>URL</span>
          <input value={url} onChange={(event) => markChanged(setUrl, event.target.value)} spellCheck={false} />
        </label>
        <button type="button" className="button--primary" onClick={() => void copyCommand()}>{copied ? "已复制命令" : "复制命令"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>Header 数</h3><p>{headerLines.length}</p></article>
        <article className="detail-card"><h3>Body 字符</h3><p>{hasBody ? body.length : 0}</p></article>
        <article className="detail-card"><h3>命令长度</h3><p>{command.length}</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Headers，每行一个</span>
          <textarea value={headers} onChange={(event) => markChanged(setHeaders, event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Body（GET 会忽略）</span>
          <textarea value={body} onChange={(event) => markChanged(setBody, event.target.value)} spellCheck={false} />
        </label>
      </div>
      <label className="tool-field">
        <span>cURL 命令</span>
        <textarea value={command} readOnly spellCheck={false} />
      </label>
      <p className="tool-note">命令使用单引号包裹参数，适合 bash/zsh；如果 Body 含有真实密钥，分享前请先脱敏。</p>
    </section>
  );
}
