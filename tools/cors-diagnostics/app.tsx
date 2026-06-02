"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function CorsDiagnosticsTool({ manifest }: ToolAppProps) {
  const [origin, setOrigin] = useState("https://app.example.com");
  const [allowedOrigins, setAllowedOrigins] = useState("https://app.example.com");
  const [methods, setMethods] = useState("GET,POST,OPTIONS");
  const [headers, setHeaders] = useState("Content-Type,Authorization");
  const [credentials, setCredentials] = useState(true);
  const [copied, setCopied] = useState(false);
  const allowedOriginList = splitCsv(allowedOrigins);
  const methodList = splitCsv(methods);
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
    credentials && allowedOrigins.trim() === "*" ? "凭据模式不能返回通配 Origin，需要回显具体 Origin。" : "",
    originAllowed ? "" : "当前请求 Origin 不在允许列表中。",
    methodList.includes("OPTIONS") ? "" : "预检请求通常需要允许 OPTIONS。"
  ].filter(Boolean);

  async function copyHeaders() {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
  }

  function resetCopied() {
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">跨域诊断</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>请求 Origin</span><input value={origin} onChange={(event) => { setOrigin(event.target.value); resetCopied(); }} /></label>
        <label className="tool-field tool-field--compact"><span>允许的 Origin</span><input value={allowedOrigins} onChange={(event) => { setAllowedOrigins(event.target.value); resetCopied(); }} /></label>
        <label className="tool-field tool-field--compact"><span>允许方法</span><input value={methods} onChange={(event) => { setMethods(event.target.value); resetCopied(); }} /></label>
        <label className="tool-field tool-field--compact"><span>允许请求头</span><input value={headers} onChange={(event) => { setHeaders(event.target.value); resetCopied(); }} /></label>
        <label className="tool-check"><input type="checkbox" checked={credentials} onChange={(event) => { setCredentials(event.target.checked); resetCopied(); }} /><span>携带凭据</span></label>
        <button type="button" onClick={() => void copyHeaders()}>{copied ? "已复制" : "复制响应头"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>Origin 匹配</h3><p>{originAllowed ? "允许" : "拒绝"}</p></article>
        <article className="detail-card"><h3>预检方法</h3><p>{methodList.includes("OPTIONS") ? "已包含" : "缺少 OPTIONS"}</p></article>
        <article className="detail-card"><h3>诊断项</h3><p>{issues.length}</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>生成的响应头</span><textarea value={generated} readOnly spellCheck={false} /></label>
        <label className="tool-field"><span>诊断结果</span><textarea value={issues.length ? issues.join("\n") : "未发现明显 CORS 配置问题。"} readOnly spellCheck={false} /></label>
      </div>
      <p className="tool-note">凭据模式下不要返回 `*`，应回显可信 Origin，并确保预检请求能通过 OPTIONS。</p>
    </section>
  );
}
