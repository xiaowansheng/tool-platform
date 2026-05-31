"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Mode = "diff" | "merge" | "sanitize" | "example";
type DiffKind = "added" | "removed" | "changed" | "equal";

interface EnvEntry {
  key: string;
  value: string;
}

interface EnvDiff {
  key: string;
  before: string;
  after: string;
  kind: DiffKind;
}

const leftEnv = `API_URL=https://api.staging.example.com
NODE_ENV=production
FEATURE_BILLING=false
DATABASE_URL=postgres://user:pass@db.internal/app
JWT_SECRET=staging-secret`;

const rightEnv = `API_URL=https://api.example.com
NODE_ENV=production
FEATURE_BILLING=true
LOG_LEVEL=info
DATABASE_URL=postgres://user:pass@prod-db.internal/app
JWT_SECRET=prod-secret`;

function parseEnv(source: string): EnvEntry[] {
  return source.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];

    const index = trimmed.indexOf("=");
    if (index === -1) return [{ key: trimmed, value: "" }];

    return [{
      key: trimmed.slice(0, index).trim(),
      value: trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "")
    }];
  });
}

function toMap(entries: EnvEntry[]) {
  return new Map(entries.map((entry) => [entry.key, entry.value]));
}

function diffEnv(left: string, right: string): EnvDiff[] {
  const before = toMap(parseEnv(left));
  const after = toMap(parseEnv(right));
  const keys = Array.from(new Set([...before.keys(), ...after.keys()])).sort();

  return keys.map((key) => {
    const beforeValue = before.get(key) ?? "";
    const afterValue = after.get(key) ?? "";
    const kind: DiffKind = before.has(key) && after.has(key)
      ? beforeValue === afterValue ? "equal" : "changed"
      : before.has(key) ? "removed" : "added";

    return { key, before: beforeValue, after: afterValue, kind };
  });
}

function isSensitive(key: string, value: string) {
  return /\b(SECRET|TOKEN|PASSWORD|PASS|API[_-]?KEY|DATABASE_URL|PRIVATE[_-]?KEY|CREDENTIAL)\b/i.test(key)
    || /^[A-Za-z0-9+/=_-]{32,}$/.test(value);
}

function sanitizeValue(key: string, value: string) {
  if (!value) return "";
  return isSensitive(key, value) ? "***REDACTED***" : value;
}

function formatEnv(entries: EnvEntry[], sanitize = false) {
  return entries
    .map((entry) => `${entry.key}=${JSON.stringify(sanitize ? sanitizeValue(entry.key, entry.value) : entry.value)}`)
    .join("\n");
}

function mergeEnv(left: string, right: string) {
  const merged = new Map<string, string>();

  parseEnv(left).forEach((entry) => merged.set(entry.key, entry.value));
  parseEnv(right).forEach((entry) => merged.set(entry.key, entry.value));

  return Array.from(merged.entries()).map(([key, value]) => ({ key, value }));
}

function buildOutput(mode: Mode, left: string, right: string) {
  if (mode === "merge") return formatEnv(mergeEnv(left, right));
  if (mode === "sanitize") return formatEnv(mergeEnv(left, right), true);
  if (mode === "example") return mergeEnv(left, right).map((entry) => `${entry.key}=`).join("\n");

  return diffEnv(left, right)
    .filter((row) => row.kind !== "equal")
    .map((row) => `${row.kind.toUpperCase()} ${row.key}: ${row.before || "(missing)"} => ${row.after || "(missing)"}`)
    .join("\n");
}

function summarize(rows: EnvDiff[]) {
  return rows.reduce(
    (summary, row) => ({
      added: summary.added + (row.kind === "added" ? 1 : 0),
      removed: summary.removed + (row.kind === "removed" ? 1 : 0),
      changed: summary.changed + (row.kind === "changed" ? 1 : 0),
      sensitive: summary.sensitive + (isSensitive(row.key, row.after || row.before) ? 1 : 0)
    }),
    { added: 0, removed: 0, changed: 0, sensitive: 0 }
  );
}

function rowClass(kind: DiffKind) {
  if (kind === "removed") return "removed";
  if (kind === "added" || kind === "changed") return "added";
  return "equal";
}

export default function EnvDiffMergeSanitizerTool({ manifest }: ToolClientProps) {
  const [left, setLeft] = useState(leftEnv);
  const [right, setRight] = useState(rightEnv);
  const [mode, setMode] = useState<Mode>("diff");
  const rows = useMemo(() => diffEnv(left, right), [left, right]);
  const summary = summarize(rows);
  const output = buildOutput(mode, left, right);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">配置工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="diff">Diff</option>
            <option value="merge">Merge</option>
            <option value="sanitize">Sanitize</option>
            <option value="example">.env.example</option>
          </select>
        </label>
        <button type="button" onClick={() => void copyOutput()}>复制输出</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>.env A</span>
          <textarea value={left} onChange={(event) => setLeft(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>.env B</span>
          <textarea value={right} onChange={(event) => setRight(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>新增</h3>
          <p>{summary.added}</p>
        </article>
        <article className="detail-card">
          <h3>变更</h3>
          <p>{summary.changed}</p>
        </article>
        <article className="detail-card">
          <h3>移除</h3>
          <p>{summary.removed}</p>
        </article>
        <article className="detail-card">
          <h3>敏感项</h3>
          <p>{summary.sensitive}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="ENV diff">
        {rows.filter((row) => row.kind !== "equal").map((row) => (
          <div key={row.key} className={`diff-line diff-line--${rowClass(row.kind)}`}>
            <span>{row.kind === "removed" ? "-" : row.kind === "added" ? "+" : "~"}</span>
            <code>{row.key}: {sanitizeValue(row.key, row.before) || "(missing)"} =&gt; {sanitizeValue(row.key, row.after) || "(missing)"}</code>
          </div>
        ))}
      </article>
      <label className="tool-field">
        <span>输出</span>
        <textarea value={output} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
