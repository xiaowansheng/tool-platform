"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function explainSql(sql: string) {
  const normalized = sql.replace(/\s+/g, " ").trim();
  const steps = [];
  const from = normalized.match(/\bfrom\s+([a-zA-Z0-9_]+)/i)?.[1];
  const joins = Array.from(normalized.matchAll(/\b(join|left join|inner join)\s+([a-zA-Z0-9_]+)/gi)).map((match) => match[2]);

  if (from) steps.push({ title: "Table Scan", detail: `Read rows from ${from}` });
  for (const join of joins) steps.push({ title: "Join", detail: `Join with ${join}` });
  if (/\bwhere\b/i.test(normalized)) steps.push({ title: "Filter", detail: normalized.match(/\bwhere\s+(.+?)(group by|order by|limit|$)/i)?.[1]?.trim() ?? "Apply predicates" });
  if (/\bgroup by\b/i.test(normalized)) steps.push({ title: "Aggregate", detail: normalized.match(/\bgroup by\s+(.+?)(having|order by|limit|$)/i)?.[1]?.trim() ?? "Group rows" });
  if (/\border by\b/i.test(normalized)) steps.push({ title: "Sort", detail: normalized.match(/\border by\s+(.+?)(limit|$)/i)?.[1]?.trim() ?? "Sort rows" });
  if (/\blimit\b/i.test(normalized)) steps.push({ title: "Limit", detail: normalized.match(/\blimit\s+(\d+)/i)?.[1] ?? "Apply limit" });
  if (steps.length === 0) steps.push({ title: "Parse", detail: "No recognizable SQL clauses found" });

  return steps;
}

export default function SqlExplainVisualizerTool({ manifest }: ToolAppProps) {
  const [sql, setSql] = useState("SELECT runtime, count(*) FROM tools WHERE featured = true GROUP BY runtime ORDER BY count DESC LIMIT 10");
  const steps = explainSql(sql);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据库工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>SQL</span>
        <textarea value={sql} onChange={(event) => setSql(event.target.value)} spellCheck={false} />
      </label>
      <div className="case-grid">
        {steps.map((step, index) => (
          <article key={`${step.title}-${index}`} className="detail-card">
            <p className="eyebrow">步骤 {index + 1}</p>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
