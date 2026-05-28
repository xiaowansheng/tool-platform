"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type DiffKind = "added" | "removed" | "changed" | "equal";

interface FlatValue {
  path: string;
  value: string;
}

interface DiffRow {
  path: string;
  before: string;
  after: string;
  kind: DiffKind;
}

const baseValues = `replicaCount: 2
image:
  repository: ghcr.io/acme/api
  tag: "1.8.0"
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
service:
  type: ClusterIP`;

const overlayValues = `replicaCount: 3
image:
  repository: ghcr.io/acme/api
  tag: "1.9.0"
resources:
  requests:
    cpu: 300m
    memory: 384Mi
  limits:
    cpu: 750m
    memory: 768Mi
service:
  type: ClusterIP`;

function stripComment(line: string) {
  const hashIndex = line.indexOf("#");

  return hashIndex === -1 ? line : line.slice(0, hashIndex);
}

function parseFlatValues(source: string): Map<string, string> {
  const values = new Map<string, string>();
  const stack: Array<{ indent: number; key: string }> = [];

  source.split(/\r?\n/).forEach((line) => {
    const withoutComment = stripComment(line);
    if (!withoutComment.trim()) return;

    const match = withoutComment.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match) return;

    const indent = match[1]?.length ?? 0;
    const key = (match[2] ?? "").trim();
    const value = (match[3] ?? "").trim().replace(/^["']|["']$/g, "");

    while (stack.length > 0 && (stack[stack.length - 1]?.indent ?? 0) >= indent) {
      stack.pop();
    }

    if (!value) {
      stack.push({ indent, key });
      return;
    }

    values.set([...stack.map((item) => item.key), key].join("."), value);
  });

  return values;
}

function diffValues(left: string, right: string): DiffRow[] {
  const before = parseFlatValues(left);
  const after = parseFlatValues(right);
  const paths = Array.from(new Set([...before.keys(), ...after.keys()])).sort();

  return paths.map((path) => {
    const beforeValue = before.get(path) ?? "";
    const afterValue = after.get(path) ?? "";
    const kind: DiffKind = before.has(path) && after.has(path)
      ? beforeValue === afterValue ? "equal" : "changed"
      : before.has(path) ? "removed" : "added";

    return { path, before: beforeValue, after: afterValue, kind };
  });
}

function summarize(rows: DiffRow[]) {
  return rows.reduce(
    (summary, row) => ({
      added: summary.added + (row.kind === "added" ? 1 : 0),
      removed: summary.removed + (row.kind === "removed" ? 1 : 0),
      changed: summary.changed + (row.kind === "changed" ? 1 : 0),
      equal: summary.equal + (row.kind === "equal" ? 1 : 0)
    }),
    { added: 0, removed: 0, changed: 0, equal: 0 }
  );
}

function detectRisks(rows: DiffRow[]) {
  const risks: string[] = [];

  rows.forEach((row) => {
    if (row.path.endsWith("image.tag") && row.after === "latest") {
      risks.push("image.tag 改为 latest，发布结果可能不可复现。");
    }

    if (row.path === "replicaCount" && Number(row.after) < Number(row.before)) {
      risks.push(`replicaCount 从 ${row.before} 降到 ${row.after}，确认容量和 PDB。`);
    }

    if (/resources\.limits\.(cpu|memory)$/.test(row.path) && row.kind === "removed") {
      risks.push(`${row.path} 被移除，可能导致资源争抢。`);
    }

    if (/service\.type$/.test(row.path) && ["NodePort", "LoadBalancer"].includes(row.after)) {
      risks.push(`service.type 改为 ${row.after}，确认外部访问策略。`);
    }
  });

  return risks;
}

function rowClass(kind: DiffKind) {
  if (kind === "added" || kind === "changed") return "added";
  if (kind === "removed") return "removed";
  return "equal";
}

export default function HelmValuesDiffTool({ manifest }: ToolClientProps) {
  const [left, setLeft] = useState(baseValues);
  const [right, setRight] = useState(overlayValues);
  const rows = useMemo(() => diffValues(left, right), [left, right]);
  const summary = summarize(rows);
  const risks = detectRisks(rows);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Helm Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Base values.yaml</span>
          <textarea value={left} onChange={(event) => setLeft(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Overlay values.yaml</span>
          <textarea value={right} onChange={(event) => setRight(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Changed</h3>
          <p>{summary.changed}</p>
        </article>
        <article className="detail-card">
          <h3>Added</h3>
          <p>{summary.added}</p>
        </article>
        <article className="detail-card">
          <h3>Removed</h3>
          <p>{summary.removed}</p>
        </article>
        <article className="detail-card">
          <h3>Risk Signals</h3>
          <p>{risks.length}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="Helm values diff">
        {rows.filter((row) => row.kind !== "equal").map((row) => (
          <div key={row.path} className={`diff-line diff-line--${rowClass(row.kind)}`}>
            <span>{row.kind === "removed" ? "-" : row.kind === "added" ? "+" : "~"}</span>
            <code>{row.path}: {row.before || "(missing)"} =&gt; {row.after || "(missing)"}</code>
          </div>
        ))}
      </article>
      {risks.length > 0 ? (
        <article className="detail-card">
          <h3>风险提示</h3>
          <ul className="compact-list">
            {risks.map((risk) => <li key={risk}>{risk}</li>)}
          </ul>
        </article>
      ) : null}
      <p className="tool-note">当前解析覆盖常见 key/value values 文件；复杂数组和模板表达式按文本值处理。</p>
    </section>
  );
}
