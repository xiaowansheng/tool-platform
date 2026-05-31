"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function format(value: number) {
  return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "N/A";
}

export default function PercentageCalculatorTool({ manifest }: ToolClientProps) {
  const [part, setPart] = useState(25);
  const [whole, setWhole] = useState(200);
  const [from, setFrom] = useState(80);
  const [to, setTo] = useState(120);

  const percentOf = whole !== 0 ? (part / whole) * 100 : Number.NaN;
  const valueOfPercent = (part / 100) * whole;
  const change = from !== 0 ? ((to - from) / from) * 100 : Number.NaN;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">效率工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>A</span>
          <input type="number" value={part} onChange={(event) => setPart(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>B</span>
          <input type="number" value={whole} onChange={(event) => setWhole(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>原值</span>
          <input type="number" value={from} onChange={(event) => setFrom(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>新值</span>
          <input type="number" value={to} onChange={(event) => setTo(Number(event.target.value))} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>A 是 B 的百分之几</h3>
          <p>{format(percentOf)}%</p>
        </article>
        <article className="detail-card">
          <h3>B 的 A%</h3>
          <p>{format(valueOfPercent)}</p>
        </article>
        <article className="detail-card">
          <h3>增减幅</h3>
          <p>{format(change)}%</p>
        </article>
      </div>
    </section>
  );
}
