"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface ColumnUsage {
  column: string;
  role: "filter" | "join" | "sort" | "group";
  operator?: string;
}

interface IndexCandidate {
  name: string;
  columns: string[];
  reason: string;
  ddl: string;
  caution: string;
}

const sampleSql = `select o.id, o.created_at, c.email
from orders o
join customers c on c.id = o.customer_id
where o.tenant_id = :tenant_id
  and o.status = 'paid'
  and o.created_at >= now() - interval '30 days'
order by o.created_at desc;`;

function normalizeIdentifier(value: string) {
  return value
    .replace(/["'`;]/g, "")
    .trim()
    .split(".")
    .pop()
    ?.replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() ?? "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractTableName(sql: string, fallback: string) {
  const fromMatch = sql.match(/\bfrom\s+([a-zA-Z0-9_".]+)/i);
  return normalizeIdentifier(fromMatch?.[1] ?? fallback) || "target_table";
}

function extractColumns(sql: string): ColumnUsage[] {
  const usages: ColumnUsage[] = [];
  const compact = sql.replace(/\s+/g, " ");

  for (const match of compact.matchAll(/\bwhere\b(.+?)(?:\border\s+by\b|\bgroup\s+by\b|\blimit\b|$)/gi)) {
    for (const columnMatch of match[1].matchAll(/([a-zA-Z_][\w."]*)\s*(=|<>|!=|>=|<=|>|<|\bin\b|\blike\b|\bis\b)/gi)) {
      usages.push({
        column: normalizeIdentifier(columnMatch[1]),
        role: "filter",
        operator: columnMatch[2].toLowerCase()
      });
    }
  }

  for (const match of compact.matchAll(/\bjoin\s+[a-zA-Z0-9_".]+\s+(?:[a-zA-Z0-9_"]+\s+)?on\s+(.+?)(?=\bjoin\b|\bwhere\b|\border\s+by\b|\bgroup\s+by\b|$)/gi)) {
    for (const columnMatch of match[1].matchAll(/([a-zA-Z_][\w."]*)\s*=\s*([a-zA-Z_][\w."]*)/g)) {
      usages.push({ column: normalizeIdentifier(columnMatch[1]), role: "join" });
      usages.push({ column: normalizeIdentifier(columnMatch[2]), role: "join" });
    }
  }

  for (const match of compact.matchAll(/\border\s+by\s+(.+?)(?:\blimit\b|$)/gi)) {
    for (const column of match[1].split(",")) {
      usages.push({
        column: normalizeIdentifier(column.replace(/\basc\b|\bdesc\b/gi, "")),
        role: "sort"
      });
    }
  }

  for (const match of compact.matchAll(/\bgroup\s+by\s+(.+?)(?:\border\s+by\b|\blimit\b|$)/gi)) {
    for (const column of match[1].split(",")) {
      usages.push({
        column: normalizeIdentifier(column),
        role: "group"
      });
    }
  }

  return usages.filter((usage) => usage.column && !["and", "or", "not", "null", "true", "false"].includes(usage.column));
}

function buildCandidates(sql: string, tableNameInput: string, writeRatio: number, cardinality: "low" | "mixed" | "high") {
  const tableName = extractTableName(sql, tableNameInput);
  const usages = extractColumns(sql);
  const filters = unique(usages.filter((item) => item.role === "filter").map((item) => item.column));
  const joins = unique(usages.filter((item) => item.role === "join").map((item) => item.column));
  const sorts = unique(usages.filter((item) => item.role === "sort").map((item) => item.column));
  const groups = unique(usages.filter((item) => item.role === "group").map((item) => item.column));
  const candidates: IndexCandidate[] = [];

  const equalityFilters = unique(
    usages
      .filter((item) => item.role === "filter" && ["=", "in", "is"].includes(item.operator ?? ""))
      .map((item) => item.column)
  );
  const rangeFilters = unique(
    usages
      .filter((item) => item.role === "filter" && [">", "<", ">=", "<=", "like"].includes(item.operator ?? ""))
      .map((item) => item.column)
  );
  const compositeColumns = unique([...equalityFilters, ...joins, ...rangeFilters.slice(0, 1), ...sorts.slice(0, 1)]);

  if (compositeColumns.length > 0) {
    const name = `idx_${tableName}_${compositeColumns.slice(0, 4).join("_")}`;
    candidates.push({
      name,
      columns: compositeColumns,
      reason: "覆盖等值过滤、join 键和首个范围/排序字段，适合这类列表查询的主候选索引。",
      ddl: `CREATE INDEX ${name} ON ${tableName} (${compositeColumns.join(", ")});`,
      caution: writeRatio > 35 ? "写入占比较高，先用 EXPLAIN 验证收益，避免额外写放大。" : "适合作为首个候选，但仍需用真实执行计划验证。"
    });
  }

  for (const column of unique([...joins, ...sorts, ...groups])) {
    if (!compositeColumns.includes(column)) {
      const name = `idx_${tableName}_${column}`;
      candidates.push({
        name,
        columns: [column],
        reason: "单列候选，适合 join、排序或分组路径的局部优化。",
        ddl: `CREATE INDEX ${name} ON ${tableName} (${column});`,
        caution: cardinality === "low" ? "低基数字段单独建索引通常收益有限，建议组合高选择性字段。" : "如果已有组合索引覆盖该列前缀，可能不需要单独索引。"
      });
    }
  }

  return {
    tableName,
    usages,
    filters,
    joins,
    sorts,
    groups,
    candidates
  };
}

function scoreCandidate(candidate: IndexCandidate) {
  return Math.min(100, candidate.columns.length * 22 + (candidate.columns.length > 1 ? 18 : 0));
}

export default function SqlIndexAdvisorTool({ manifest }: ToolClientProps) {
  const [sql, setSql] = useState(sampleSql);
  const [tableName, setTableName] = useState("orders");
  const [writeRatio, setWriteRatio] = useState(20);
  const [cardinality, setCardinality] = useState<"low" | "mixed" | "high">("mixed");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const analysis = useMemo(() => buildCandidates(sql, tableName, writeRatio, cardinality), [cardinality, sql, tableName, writeRatio]);
  const ddl = analysis.candidates.map((candidate) => candidate.ddl).join("\n");

  async function copyDdl() {
    try {
      await navigator.clipboard.writeText(ddl);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Database Performance</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>目标表</span>
          <input value={tableName} onChange={(event) => setTableName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>字段基数</span>
          <select value={cardinality} onChange={(event) => setCardinality(event.target.value as "low" | "mixed" | "high")}>
            <option value="mixed">mixed</option>
            <option value="high">high</option>
            <option value="low">low</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>写入占比 {writeRatio}%</span>
          <input type="range" min="0" max="100" value={writeRatio} onChange={(event) => setWriteRatio(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyDdl()} disabled={!ddl}>{copied ? "已复制" : "复制 DDL"}</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SQL</span>
          <textarea value={sql} onChange={(event) => {
            setSql(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>

        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card">
              <h3>Filters</h3>
              <p>{analysis.filters.length}</p>
            </article>
            <article className="detail-card">
              <h3>Joins</h3>
              <p>{analysis.joins.length}</p>
            </article>
            <article className="detail-card">
              <h3>Sorts</h3>
              <p>{analysis.sorts.length}</p>
            </article>
            <article className="detail-card">
              <h3>Candidates</h3>
              <p>{analysis.candidates.length}</p>
            </article>
          </div>

          {analysis.candidates.map((candidate) => (
            <article className="detail-card" key={candidate.name}>
              <h3>{candidate.name}</h3>
              <p>{candidate.reason}</p>
              <div className="mono-output">{candidate.ddl}</div>
              <p>Score: {scoreCandidate(candidate)} / 100 · {candidate.caution}</p>
            </article>
          ))}

          {analysis.candidates.length === 0 ? (
            <div className="empty-state">
              <strong>没有解析到可建议的字段</strong>
              <p>请提供包含 WHERE、JOIN、ORDER BY 或 GROUP BY 的查询。</p>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">这是启发式建议，不替代真实数据库上的 EXPLAIN / ANALYZE；创建索引前应确认现有索引、数据分布和写入成本。</p>
    </section>
  );
}
