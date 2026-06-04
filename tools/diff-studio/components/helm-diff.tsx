"use client";

import { useMemo, useState } from "react";

type DiffKind = "added" | "removed" | "changed" | "equal";

interface DiffRow {
  path: string;
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
      risks.push(`replicaCount 从 ${row.before} 降到 ${row.after}，确认集群容量和 Pod Disruption Budget (PDB)。`);
    }

    if (/resources\.limits\.(cpu|memory)$/.test(row.path) && row.kind === "removed") {
      risks.push(`${row.path} 资源限制被移除，这可能导致集群节点资源耗尽与抢占。`);
    }

    if (/service\.type$/.test(row.path) && ["NodePort", "LoadBalancer"].includes(row.after)) {
      risks.push(`service.type 改为 ${row.after}，这将暴露端口到外部，请确认访问控制及网络安全策略。`);
    }
  });

  return risks;
}

function rowClass(kind: DiffKind) {
  if (kind === "added" || kind === "changed") return "added";
  if (kind === "removed") return "removed";
  return "equal";
}

export default function HelmDiffTab({ leftText, onChangeLeftText, rightText, onChangeRightText }: ComponentProps) {
  const rows = useMemo(() => diffValues(leftText, rightText), [leftText, rightText]);
  const summary = summarize(rows);
  const risks = detectRisks(rows);

  const handleClear = () => {
    onChangeLeftText("");
    onChangeRightText("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>基准 values.yaml (左侧)</span>
          <textarea 
            value={leftText} 
            onChange={(event) => onChangeLeftText(event.target.value)} 
            placeholder="replicaCount: 2
image:
  repository: ghcr.io/acme/api
  tag: 1.8.0..."
            spellCheck={false} 
            style={{ minHeight: "220px", fontFamily: "monospace" }}
          />
        </label>
        <label className="tool-field">
          <span>覆盖 values.yaml (右侧)</span>
          <textarea 
            value={rightText} 
            onChange={(event) => onChangeRightText(event.target.value)} 
            placeholder="replicaCount: 3
image:
  repository: ghcr.io/acme/api
  tag: 1.9.0..."
            spellCheck={false} 
            style={{ minHeight: "220px", fontFamily: "monospace" }}
          />
        </label>
      </div>

      {(leftText || rightText) && (
        <>
          <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>新增属性数</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--success, #10b981)" }}>{summary.added}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>修改属性数</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--warning, #f59e0b)" }}>{summary.changed}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>移除属性数</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--danger, #ef4444)" }}>{summary.removed}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>审计高危风险项</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: risks.length > 0 ? "var(--danger, #ef4444)" : "var(--success)" }}>{risks.length}</div>
            </article>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="button--danger" onClick={handleClear}>清空输入</button>
          </div>

          {risks.length > 0 && (
            <article className="detail-card" style={{ padding: "1rem", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", background: "rgba(239,68,68,0.05)" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--danger, #ef4444)", fontWeight: "bold" }}>🚨 高危发布风险提示</h4>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.6" }}>
                {risks.map((risk) => <li key={risk}>{risk}</li>)}
              </ul>
            </article>
          )}

          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>配置结构扁平路径差异详情</div>
          <article className="diff-view" aria-label="Helm values 差异" style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", fontFamily: "monospace", fontSize: "0.85rem", background: "var(--bg-base)" }}>
            {rows.filter((row) => row.kind !== "equal").map((row) => {
              const isRemoved = row.kind === "removed";
              const bgColor = isRemoved ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";
              const markerColor = isRemoved ? "var(--danger)" : "var(--success)";
              return (
                <div 
                  key={row.path} 
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
                    {row.path}: {row.before || "(missing)"} =&gt; {row.after || "(missing)"}
                  </code>
                </div>
              );
            })}
            {rows.filter((row) => row.kind !== "equal").length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                没有检测到任何层级路径下的 YAML 配置值变化。
              </div>
            )}
          </article>
        </>
      )}

      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
        说明：当前解析覆盖常见 Helm values 缩进层次，自动扁平化为带点的路径命名进行对比；数组和复杂的 YAML 语法按文本值进行基础比对。
      </p>
    </div>
  );
}
