"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
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
  const command = [
    "curl",
    "-X",
    method,
    shellQuote(url),
    ...parseHeaders(headers).flatMap((header) => ["-H", shellQuote(header)]),
    body.trim() ? "-d" : "",
    body.trim() ? shellQuote(body) : ""
  ].filter(Boolean).join(" \\\n  ");

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyCommand()}>{copied ? "已复制" : "复制命令"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Headers，每行一个</span>
          <textarea value={headers} onChange={(event) => setHeaders(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Body</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <label className="tool-field">
        <span>cURL</span>
        <textarea value={command} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
