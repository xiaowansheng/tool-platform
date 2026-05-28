"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function CorsDiagnosticsTool({ manifest }: ToolClientProps) {
  const [origin, setOrigin] = useState("https://app.example.com");
  const [allowedOrigins, setAllowedOrigins] = useState("https://app.example.com");
  const [methods, setMethods] = useState("GET,POST,OPTIONS");
  const [headers, setHeaders] = useState("Content-Type,Authorization");
  const [credentials, setCredentials] = useState(true);
  const [copied, setCopied] = useState(false);
  const allowedOriginList = splitCsv(allowedOrigins);
  const wildcardAllowed = allowedOrigins.trim() === "*";
  const originAllowed = allowedOriginList.includes(origin) || wildcardAllowed;
  const responseOrigin = originAllowed
    ? wildcardAllowed
      ? credentials ? origin : "*"
      : origin
    : "";
  const generated = originAllowed
    ? [
        `Access-Control-Allow-Origin: ${responseOrigin}`,
        `Access-Control-Allow-Methods: ${methods}`,
        `Access-Control-Allow-Headers: ${headers}`,
        credentials ? "Access-Control-Allow-Credentials: true" : ""
      ].filter(Boolean).join("\n")
    : "不返回 Access-Control-Allow-Origin；当前 Origin 未被允许。";
  const issues = [
    credentials && allowedOrigins.trim() === "*" ? "Credentials 模式不能返回 wildcard origin，需要回显具体 Origin。" : "",
    originAllowed ? "" : "当前请求 Origin 不在允许列表中。",
    splitCsv(methods).includes("OPTIONS") ? "" : "预检请求通常需要允许 OPTIONS。"
  ].filter(Boolean);

  async function copyHeaders() {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Network Security</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>Request Origin</span><input value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>Allowed Origins</span><input value={allowedOrigins} onChange={(event) => setAllowedOrigins(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>Methods</span><input value={methods} onChange={(event) => setMethods(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>Headers</span><input value={headers} onChange={(event) => setHeaders(event.target.value)} /></label>
        <label className="tool-check"><input type="checkbox" checked={credentials} onChange={(event) => setCredentials(event.target.checked)} /><span>Credentials</span></label>
        <button type="button" onClick={() => void copyHeaders()}>{copied ? "已复制" : "复制 Headers"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>Generated Headers</span><textarea value={generated} readOnly spellCheck={false} /></label>
        <label className="tool-field"><span>Diagnostics</span><textarea value={issues.length ? issues.join("\n") : "No obvious CORS issue found."} readOnly spellCheck={false} /></label>
      </div>
    </section>
  );
}
