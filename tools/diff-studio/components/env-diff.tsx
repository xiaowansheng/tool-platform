"use client";

import { useMemo, useState } from "react";

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

interface ComponentProps {
  leftText: string;
  onChangeLeftText: (text: string) => void;
  rightText: string;
  onChangeRightText: (text: string) => void;
}

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

export default function EnvDiffTab({ leftText, onChangeLeftText, rightText, onChangeRightText }: ComponentProps) {
  const [mode, setMode] = useState<Mode>("diff");
  const rows = useMemo(() => diffEnv(leftText, rightText), [leftText, rightText]);
  const summary = summarize(rows);
  const output = buildOutput(mode, leftText, rightText);
  const [copied, setCopied] = useState(false);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleClear = () => {
    onChangeLeftText("");
    onChangeRightText("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <label className="tool-field tool-field--compact">
          <span>处理模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="diff">差异分析</option>
            <option value="merge">双向合并</option>
            <option value="sanitize">密码脱敏合并</option>
            <option value="example">导出 .env.example 模板</option>
          </select>
        </label>
        <button type="button" className="button--primary" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制输出" : "复制输出内容"}
        </button>
        <button type="button" className="button--danger" onClick={handleClear}>清空输入</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>.env A (原始)</span>
          <textarea 
            value={leftText} 
            onChange={(event) => onChangeLeftText(event.target.value)} 
            placeholder="KEY=VALUE 格式..."
            spellCheck={false} 
            style={{ minHeight: "220px", fontFamily: "monospace" }}
          />
        </label>
        <label className="tool-field">
          <span>.env B (对比/覆盖)</span>
          <textarea 
            value={rightText} 
            onChange={(event) => onChangeRightText(event.target.value)} 
            placeholder="KEY=VALUE 格式..."
            spellCheck={false} 
            style={{ minHeight: "220px", fontFamily: "monospace" }}
          />
        </label>
      </div>

      {(leftText || rightText) && (
        <>
          <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>新增配置</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--success, #10b981)" }}>{summary.added}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>值已变更</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--warning, #f59e0b)" }}>{summary.changed}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>移除配置</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--danger, #ef4444)" }}>{summary.removed}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>敏感凭证项</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: summary.sensitive > 0 ? "var(--danger)" : "var(--text-secondary)" }}>{summary.sensitive}</div>
            </article>
          </div>

          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>差异变化详情 (自动脱敏)</div>
          <article className="diff-view" aria-label="ENV 差异" style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", fontFamily: "monospace", fontSize: "0.85rem", background: "var(--bg-base)" }}>
            {rows.filter((row) => row.kind !== "equal").map((row) => {
              const isAdded = row.kind === "added" || row.kind === "changed";
              const isRemoved = row.kind === "removed";
              const bgColor = row.kind === "removed" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";
              const markerColor = isRemoved ? "var(--danger)" : "var(--success)";
              return (
                <div 
                  key={row.key} 
                  style={{ 
                    display: "flex", 
                    padding: "0.2rem 0.5rem", 
                    backgroundColor: bgColor,
                    borderBottom: "1px solid var(--border-muted, #f3f4f6)"
                  }}
                >
                  <span style={{ width: "24px", color: markerColor, fontWeight: "bold", userSelect: "none" }}>
                    {row.kind === "removed" ? "-" : row.kind === "added" ? "+" : "~"}
                  </span>
                  <code style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {row.key}: {sanitizeValue(row.key, row.before) || "(missing)"} =&gt; {sanitizeValue(row.key, row.after) || "(missing)"}
                  </code>
                </div>
              );
            })}
            {rows.filter((row) => row.kind !== "equal").length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                没有检测到任何新增、变更或被移除的变量。
              </div>
            )}
          </article>

          <label className="tool-field">
            <span>处理结果输出</span>
            <textarea 
              value={output} 
              readOnly 
              spellCheck={false} 
              style={{ minHeight: "220px", fontFamily: "monospace", background: "var(--bg-muted)" }}
            />
          </label>
        </>
      )}
    </div>
  );
}
