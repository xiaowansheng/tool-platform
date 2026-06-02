"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface AccessEntry {
  ip: string;
  time: string;
  method: string;
  path: string;
  protocol: string;
  status: number;
  bytes: number;
  referer: string;
  userAgent: string;
}

const sampleAccessLog = `203.0.113.7 - - [28/May/2026:10:01:03 +0000] "GET /health HTTP/1.1" 200 42 "-" "curl/8.0"
203.0.113.9 - - [28/May/2026:10:01:18 +0000] "POST /api/orders HTTP/1.1" 201 932 "https://example.test/app" "Mozilla/5.0"
198.51.100.4 - - [28/May/2026:10:02:42 +0000] "GET /checkout HTTP/1.1" 502 128 "https://example.test/cart" "Mozilla/5.0"
203.0.113.7 - - [28/May/2026:10:03:10 +0000] "GET /assets/app.js HTTP/1.1" 304 0 "-" "Mozilla/5.0"`;

const combinedPattern = /^(\S+) \S+ \S+ \[([^\]]+)] "(\S+)\s+([^"]*?)(?:\s+(HTTP\/[^"]+))?" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?/;

function parseAccessLog(input: string) {
  const entries: AccessEntry[] = [];
  const rejected: string[] = [];

  for (const line of input.split(/\r?\n/).filter((item) => item.trim() !== "")) {
    const match = line.match(combinedPattern);

    if (!match) {
      rejected.push(line);
      continue;
    }

    entries.push({
      ip: match[1],
      time: match[2],
      method: match[3],
      path: match[4],
      protocol: match[5] ?? "",
      status: Number(match[6]),
      bytes: match[7] === "-" ? 0 : Number(match[7]),
      referer: match[8] ?? "",
      userAgent: match[9] ?? ""
    });
  }

  return { entries, rejected };
}

function countBy<T extends string | number>(items: T[]) {
  const counts = new Map<T, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function AccessLogParserTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleAccessLog);
  const [copyError, setCopyError] = useState("");
  const parsed = useMemo(() => parseAccessLog(input), [input]);
  const statusCounts = countBy(parsed.entries.map((entry) => entry.status));
  const methodCounts = countBy(parsed.entries.map((entry) => entry.method));
  const topPaths = countBy(parsed.entries.map((entry) => entry.path)).slice(0, 8);
  const totalBytes = parsed.entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const errorCount = parsed.entries.filter((entry) => entry.status >= 500).length;

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      try {
        setInput(await file.text());
      } catch (error) {
        // File read failed
      }
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(parsed.entries, null, 2));
      setCopyError("");
    } catch (error) {
      setCopyError("复制失败，请检查权限");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">访问日志</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>导入访问日志</span>
          <input type="file" accept=".log,.txt" onChange={(event) => void loadFile(event)} />
        </label>
        <button type="button" onClick={() => void copyJson()}>
          复制 JSON
        </button>
      </div>
      <label className="tool-field">
        <span>访问日志</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>请求数</h3>
          <p>{parsed.entries.length}</p>
        </article>
        <article className="detail-card">
          <h3>解析失败</h3>
          <p>{parsed.rejected.length}</p>
        </article>
        <article className="detail-card">
          <h3>5xx</h3>
          <p>{errorCount}</p>
        </article>
        <article className="detail-card">
          <h3>传输量</h3>
          <p>{formatBytes(totalBytes)}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head">
            <span>状态码</span>
            <span>次数</span>
          </div>
          {statusCounts.map(([status, count]) => (
            <div key={status} className="tool-table__row">
              <span>{status}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head">
            <span>方法</span>
            <span>次数</span>
          </div>
          {methodCounts.map(([method, count]) => (
            <div key={method} className="tool-table__row">
              <span>{method}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>热门路径</span>
          <span>次数</span>
        </div>
        {topPaths.map(([path, count]) => (
          <div key={path} className="tool-table__row">
            <span>{path}</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "7rem 5rem minmax(12rem, 1fr) 5rem 6rem" }}>
          <span>IP</span>
          <span>方法</span>
          <span>路径</span>
          <span>状态</span>
          <span>字节数</span>
        </div>
        {parsed.entries.slice(0, 12).map((entry, index) => (
          <div key={`${entry.ip}-${entry.path}-${index}`} className="tool-table__row" style={{ gridTemplateColumns: "7rem 5rem minmax(12rem, 1fr) 5rem 6rem" }}>
            <span>{entry.ip}</span>
            <span>{entry.method}</span>
            <span>{entry.path}</span>
            <span>{entry.status}</span>
            <span>{formatBytes(entry.bytes)}</span>
          </div>
        ))}
      </div>
      {copyError ? <p className="tool-error">{copyError}</p> : null}
      <p className="tool-note">支持 Combined Log Format（Apache/Nginx 常见格式），可粘贴日志或上传 .log/.txt 文件。</p>
    </section>
  );
}
