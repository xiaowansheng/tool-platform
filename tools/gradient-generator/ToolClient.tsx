"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function GradientGeneratorTool({ manifest }: ToolClientProps) {
  const [from, setFrom] = useState("#0f766e");
  const [to, setTo] = useState("#38bdf8");
  const [angle, setAngle] = useState(135);
  const gradient = `linear-gradient(${angle}deg, ${from}, ${to})`;
  const css = `background: ${gradient};`;

  async function copyCss() {
    await navigator.clipboard.writeText(css);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Design Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>From</span>
          <input value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>To</span>
          <input value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Angle</span>
          <input type="number" value={angle} onChange={(event) => setAngle(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyCss()}>复制 CSS</button>
      </div>
      <div className="visual-preview" style={{ background: gradient }} />
      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
