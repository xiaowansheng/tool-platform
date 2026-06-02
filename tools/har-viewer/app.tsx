"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface HarEntry {
  startedDateTime?: string;
  time?: number;
  request?: {
    method?: string;
    url?: string;
  };
  response?: {
    status?: number;
    statusText?: string;
    content?: {
      size?: number;
      mimeType?: string;
    };
  };
}

interface HarFile {
  log?: {
    entries?: HarEntry[];
  };
}

const sampleHar = JSON.stringify({
  log: {
    entries: [
      {
        startedDateTime: "2026-05-28T10:01:03.000Z",
        time: 128,
        request: { method: "GET", url: "https://api.example.test/health" },
        response: { status: 200, statusText: "OK", content: { size: 42, mimeType: "application/json" } }
      },
      {
        startedDateTime: "2026-05-28T10:01:04.000Z",
        time: 840,
        request: { method: "POST", url: "https://api.example.test/orders" },
        response: { status: 201, statusText: "Created", content: { size: 932, mimeType: "application/json" } }
      },
      {
        startedDateTime: "2026-05-28T10:01:05.000Z",
        time: 1210,
        request: { method: "GET", url: "https://cdn.example.test/app.js" },
        response: { status: 304, statusText: "Not Modified", content: { size: 0, mimeType: "text/javascript" } }
      }
    ]
  }
}, null, 2);

function getDomain(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function countBy(items: string[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
}

function parseHar(input: string) {
  const parsed = JSON.parse(input) as HarFile;
  const entries = parsed.log?.entries ?? [];
  const totalTime = entries.reduce((sum, entry) => sum + (entry.time ?? 0), 0);
  const totalBytes = entries.reduce((sum, entry) => sum + Math.max(0, entry.response?.content?.size ?? 0), 0);
  const slowest = [...entries].sort((left, right) => (right.time ?? 0) - (left.time ?? 0)).slice(0, 8);

  return {
    entries,
    totalTime,
    totalBytes,
    slowest,
    statuses: countBy(entries.map((entry) => String(entry.response?.status ?? "unknown"))),
    methods: countBy(entries.map((entry) => entry.request?.method ?? "unknown")),
    domains: countBy(entries.map((entry) => getDomain(entry.request?.url ?? ""))).slice(0, 8)
  };
}

export default function HarViewerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleHar);
  const report = useMemo(() => {
    try {
      return {
        data: parseHar(input),
        error: ""
      };
    } catch (parseError) {
      return {
        data: parseHar(sampleHar),
        error: parseError instanceof Error ? parseError.message : "HAR 解析失败"
      };
    }
  }, [input]);
  const data = report.data;

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      setInput(await file.text());
    }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(JSON.stringify({
      requests: data.entries.length,
      totalTime: data.totalTime,
      totalBytes: data.totalBytes,
      statuses: data.statuses,
      domains: data.domains
    }, null, 2));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络请求追踪</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>导入 HAR</span>
          <input type="file" accept=".har,application/json" onChange={(event) => void loadFile(event)} />
        </label>
        <button type="button" onClick={() => void copySummary()}>
          复制摘要
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>HAR JSON</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card">
              <h3>请求数</h3>
              <p>{data.entries.length}</p>
            </article>
            <article className="detail-card">
              <h3>总耗时</h3>
              <p>{data.totalTime.toFixed(0)} ms</p>
            </article>
            <article className="detail-card">
              <h3>传输体积</h3>
              <p>{formatBytes(data.totalBytes)}</p>
            </article>
          </div>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>域名</span>
              <span>次数</span>
            </div>
            {data.domains.map(([domain, count]) => (
              <div key={domain} className="tool-table__row">
                <span>{domain}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "5rem minmax(14rem, 1fr) 5rem 6rem 7rem" }}>
          <span>方法</span>
          <span>URL</span>
          <span>状态</span>
          <span>耗时</span>
          <span>体积</span>
        </div>
        {data.slowest.map((entry, index) => (
          <div key={`${entry.request?.url}-${index}`} className="tool-table__row" style={{ gridTemplateColumns: "5rem minmax(14rem, 1fr) 5rem 6rem 7rem" }}>
            <span>{entry.request?.method ?? "GET"}</span>
            <span>{entry.request?.url ?? ""}</span>
            <span>{entry.response?.status ?? "无"}</span>
            <span>{(entry.time ?? 0).toFixed(0)} ms</span>
            <span>{formatBytes(Math.max(0, entry.response?.content?.size ?? 0))}</span>
          </div>
        ))}
      </div>
      {report.error ? <p className="tool-error">{report.error}</p> : null}
    </section>
  );
}
