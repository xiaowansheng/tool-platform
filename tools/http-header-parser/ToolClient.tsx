"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseHeaders(input: string) {
  return input.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(":");

      return index === -1
        ? { key: line, value: "" }
        : { key: line.slice(0, index).trim(), value: line.slice(index + 1).trim() };
    });
}

function securityHints(headers: Array<{ key: string; value: string }>) {
  const keys = new Set(headers.map((header) => header.key.toLowerCase()));
  const hints = [];

  if (!keys.has("content-security-policy")) hints.push("缺少 Content-Security-Policy");
  if (!keys.has("strict-transport-security")) hints.push("缺少 Strict-Transport-Security");
  if (!keys.has("x-content-type-options")) hints.push("缺少 X-Content-Type-Options");

  return hints;
}

export default function HttpHeaderParserTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Content-Type: application/json\nCache-Control: no-store\nX-Content-Type-Options: nosniff");
  const headers = parseHeaders(input);
  const hints = securityHints(headers);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Network Debugging</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>Raw headers</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>Header</span>
          <span>Value</span>
        </div>
        {headers.map((header) => (
          <div key={`${header.key}-${header.value}`} className="tool-table__row">
            <span>{header.key}</span>
            <span>{header.value || "empty"}</span>
          </div>
        ))}
      </div>
      <div className="detail-card">
        <h3>Security hints</h3>
        <p>{hints.length > 0 ? hints.join(" / ") : "常见安全 Header 已覆盖"}</p>
      </div>
    </section>
  );
}
