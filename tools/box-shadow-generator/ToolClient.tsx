"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function BoxShadowGeneratorTool({ manifest }: ToolClientProps) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(18);
  const [blur, setBlur] = useState(42);
  const [spread, setSpread] = useState(-12);
  const [color, setColor] = useState("rgba(15, 118, 110, 0.45)");
  const shadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  const css = `box-shadow: ${shadow};`;
  const numericFields: Array<{
    label: string;
    value: number;
    setValue: (next: number) => void;
  }> = [
    { label: "X", value: x, setValue: setX },
    { label: "Y", value: y, setValue: setY },
    { label: "Blur", value: blur, setValue: setBlur },
    { label: "Spread", value: spread, setValue: setSpread }
  ];

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
        {numericFields.map((field) => (
          <label key={field.label} className="tool-field tool-field--compact">
            <span>{field.label}</span>
            <input type="number" value={field.value} onChange={(event) => field.setValue(Number(event.target.value))} />
          </label>
        ))}
        <label className="tool-field tool-field--compact">
          <span>Color</span>
          <input value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyCss()}>复制 CSS</button>
      </div>
      <div className="shadow-preview">
        <div style={{ boxShadow: shadow }}>Shadow preview</div>
      </div>
      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
