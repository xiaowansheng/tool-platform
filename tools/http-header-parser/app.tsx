"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ParsedHeader {
  key: string;
  value: string;
}

function parseHeaders(input: string) {
  const ignored: string[] = [];
  const headers = input.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index): ParsedHeader[] => {
      const normalized = /^HTTP\/\d(?:\.\d)?\s+/.test(line) ? "Status: " + line : line;
      const separatorIndex = normalized.indexOf(":");

      if (separatorIndex === -1) {
        ignored.push("第 " + (index + 1) + " 行缺少冒号：" + line);
        return [];
      }

      return [{ key: normalized.slice(0, separatorIndex).trim(), value: normalized.slice(separatorIndex + 1).trim() }];
    });

  return { headers, ignored };
}

function securityHints(headers: ParsedHeader[]) {
  const keys = new Set(headers.map((header) => header.key.toLowerCase()));
  const hints = [];

  if (!keys.has("content-security-policy")) hints.push("缺少 Content-Security-Policy");
  if (!keys.has("strict-transport-security")) hints.push("缺少 Strict-Transport-Security");
  if (!keys.has("x-content-type-options")) hints.push("缺少 X-Content-Type-Options");
  if (!keys.has("referrer-policy")) hints.push("缺少 Referrer-Policy");

  return hints;
}

export default function HttpHeaderParserTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("HTTP/2 200\nContent-Type: application/json\nCache-Control: no-store\nX-Content-Type-Options: nosniff");
  const parsed = useMemo(() => parseHeaders(input), [input]);
  const hints = securityHints(parsed.headers);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">响应头排查</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>Header 数</h3><p>{parsed.headers.length}</p></article>
        <article className="detail-card"><h3>忽略行</h3><p>{parsed.ignored.length}</p></article>
        <article className="detail-card"><h3>安全提示</h3><p>{hints.length}</p></article>
      </div>
      <label className="tool-field">
        <span>原始请求头</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>请求头</span>
          <span>值</span>
        </div>
        {parsed.headers.length > 0 ? parsed.headers.map((header, index) => (
          <div key={header.key + "-" + index} className="tool-table__row">
            <span className="mono-output">{header.key}</span>
            <span className="mono-output">{header.value || "空值"}</span>
          </div>
        )) : (
          <div className="tool-table__row"><span>-</span><span>暂无可解析 Header</span></div>
        )}
      </div>
      {parsed.ignored.length > 0 ? <p className="tool-error">{parsed.ignored.join("；")}</p> : null}
      <p className={hints.length ? "tool-error" : "tool-note"}>{hints.length > 0 ? hints.join(" / ") : "常见安全 Header 已覆盖。"}</p>
    </section>
  );
}
