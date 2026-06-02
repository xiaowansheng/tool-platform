"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface TokenCount {
  token: string;
  count: number;
}

const sampleLog = `2026-05-28T10:01:03Z INFO api request completed status=200 path=/health duration=18ms
2026-05-28T10:02:10Z WARN worker retry queue=emails attempt=2
2026-05-28T10:02:42Z ERROR api payment failed status=502 path=/checkout trace=abc-123
2026-05-28T10:03:11Z INFO api request completed status=201 path=/orders duration=92ms
2026-05-28T10:04:04Z DEBUG cache refresh key=pricing`;

const levelMatchers = [
  { level: "ERROR", pattern: /\b(error|fatal|critical|exception|panic)\b/i },
  { level: "WARN", pattern: /\b(warn|warning)\b/i },
  { level: "INFO", pattern: /\b(info|notice)\b/i },
  { level: "DEBUG", pattern: /\b(debug|trace)\b/i }
] as const;

function classifyLevel(line: string) {
  return levelMatchers.find((matcher) => matcher.pattern.test(line))?.level ?? "OTHER";
}

function extractTimestamp(line: string) {
  const iso = line.match(/\b\d{4}-\d{2}-\d{2}[T ][0-9:.]+(?:Z|[+-]\d{2}:?\d{2})?\b/);

  if (iso) {
    const parsed = new Date(iso[0].replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const bracket = line.match(/\[(\d{2}\/[A-Za-z]{3}\/\d{4}:[^\]]+)\]/);

  if (bracket) {
    const parsed = new Date(bracket[1].replace(/^(\d{2})\/([A-Za-z]{3})\/(\d{4}):/, "$2 $1 $3 "));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function bucketMinute(date: Date) {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function topTokens(lines: string[]): TokenCount[] {
  const frequency = new Map<string, number>();
  const stopWords = new Set(["the", "and", "with", "from", "true", "false", "info", "warn", "error", "debug"]);

  for (const token of lines.join("\n").toLowerCase().match(/[a-z][a-z0-9_.:/=-]{2,}/g) ?? []) {
    if (!stopWords.has(token) && !/^\d+$/.test(token)) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  return Array.from(frequency.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 12)
    .map(([token, count]) => ({ token, count }));
}

function analyzeLog(input: string) {
  const lines = input.split(/\r?\n/).filter((line) => line.trim() !== "");
  const levels = new Map<string, number>([
    ["ERROR", 0],
    ["WARN", 0],
    ["INFO", 0],
    ["DEBUG", 0],
    ["OTHER", 0]
  ]);
  const statusCodes = new Map<string, number>();
  const minutes = new Map<string, number>();
  const errorSamples: string[] = [];

  for (const line of lines) {
    const level = classifyLevel(line);
    levels.set(level, (levels.get(level) ?? 0) + 1);

    if (level === "ERROR" && errorSamples.length < 5) {
      errorSamples.push(line);
    }

    const timestamp = extractTimestamp(line);

    if (timestamp) {
      const key = bucketMinute(timestamp);
      minutes.set(key, (minutes.get(key) ?? 0) + 1);
    }

    const status = line.match(/\bstatus[=:](\d{3})\b|\b([1-5]\d{2})\b/);

    if (status) {
      const code = status[1] ?? status[2];
      statusCodes.set(code, (statusCodes.get(code) ?? 0) + 1);
    }
  }

  return {
    lines,
    levels: Array.from(levels.entries()).map(([level, count]) => ({ level, count })),
    statusCodes: Array.from(statusCodes.entries()).sort((left, right) => left[0].localeCompare(right[0])),
    minutes: Array.from(minutes.entries()).sort((left, right) => left[0].localeCompare(right[0])).slice(-12),
    errorSamples,
    tokens: topTokens(lines)
  };
}

export default function LogFileAnalyzerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleLog);
  const report = useMemo(() => analyzeLog(input), [input]);

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      setInput(await file.text());
    }
  }

  const [copied, setCopied] = useState(false);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">日志分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>导入日志</span>
          <input type="file" accept=".log,.txt" onChange={(event) => void loadFile(event)} />
        </label>
        <button type="button" onClick={() => void copyReport()}>
          {copied ? "已复制" : "复制报告 JSON"}
        </button>
      </div>
      <label className="tool-field">
        <span>日志内容</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>总行数</h3>
          <p>{report.lines.length}</p>
        </article>
        {report.levels.map((item) => (
          <article key={item.level} className="detail-card">
            <h3>{item.level}</h3>
            <p>{item.count}</p>
          </article>
        ))}
      </div>
      <div className="workspace workspace--two-column">
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head">
            <span>状态码</span>
            <span>次数</span>
          </div>
          {report.statusCodes.map(([code, count]) => (
            <div key={code} className="tool-table__row">
              <span>{code}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head">
            <span>高频词</span>
            <span>次数</span>
          </div>
          {report.tokens.map((item) => (
            <div key={item.token} className="tool-table__row">
              <span>{item.token}</span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
      <label className="tool-field">
        <span>错误样本</span>
        <textarea value={report.errorSamples.join("\n")} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
