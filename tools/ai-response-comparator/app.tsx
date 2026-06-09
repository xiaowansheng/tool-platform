"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function metrics(text: string) {
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const unique = new Set(words.map((word) => word.toLowerCase())).size;
  const bullets = (text.match(/^\s*[-*\d.]+\s/gm) ?? []).length;
  const code = (text.match(/```/g) ?? []).length / 2;
  const caveats = (text.match(/\b(maybe|might|可能|大概|不确定|assume|假设)\b/giu) ?? []).length;
  const score = Math.max(0, Math.min(100, 50 + Math.min(20, bullets * 4) + Math.min(20, unique / 6) + Math.min(10, code * 3) - caveats * 3));
  return { chars: text.length, words: words.length, unique, bullets, code, caveats, score };
}

export default function AiResponseComparatorTool({ manifest }: ToolAppProps) {
  const [a, setA] = useState("Use a shared Topbar prop to hide the example CTA on tool detail pages. Add type checks and build verification.");
  const [b, setB] = useState("The issue is a hardcoded JSON formatter URL in the shared header. Make the CTA configurable and disable it for tool pages.");
  const rows = useMemo(() => [{ name: "Response A", text: a, m: metrics(a) }, { name: "Response B", text: b, m: metrics(b) }], [a, b]);
  const common = useMemo(() => {
    const left = new Set(a.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
    const right = new Set(b.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
    return [...left].filter((word) => right.has(word)).slice(0, 20);
  }, [a, b]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">AI QA</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>响应 A</span><textarea value={a} onChange={(event) => setA(event.target.value)} rows={10} /></label><label className="tool-field"><span>响应 B</span><textarea value={b} onChange={(event) => setB(event.target.value)} rows={10} /></label></div>
      <div className="detail-grid">{rows.map((row) => <article key={row.name} className="detail-card"><h3>{row.name}</h3><p>{row.m.score.toFixed(0)} / 100</p><p className="mono-output">{row.m.words} words, {row.m.bullets} bullets, {row.m.caveats} caveats</p></article>)}</div>
      <article className="detail-card"><h3>共同关键词</h3><p className="mono-output">{common.join(", ") || "无明显重叠"}</p></article>
    </section>
  );
}
