"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function hexToRgba(hex: string, alpha: number) {
  const value = hex.trim().replace(/^#/, "");
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(15, 118, 110, ${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeHexColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function BoxShadowGeneratorTool({ manifest }: ToolClientProps) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(20);
  const [blur, setBlur] = useState(48);
  const [spread, setSpread] = useState(-18);
  const [shadowColor, setShadowColor] = useState("#0f766e");
  const [shadowAlpha, setShadowAlpha] = useState(0.45);
  const [inset, setInset] = useState(false);
  const [ambientLayer, setAmbientLayer] = useState(true);
  const [radius, setRadius] = useState(24);
  const [surface, setSurface] = useState("#0d1824");
  const [borderAlpha, setBorderAlpha] = useState(0.18);
  const [backdropBlur, setBackdropBlur] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [textGlow, setTextGlow] = useState(0);
  const shadow = `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${hexToRgba(shadowColor, shadowAlpha)}`;
  const ambientShadow = `0 ${Math.round(y / 2)}px ${Math.round(blur * 1.5)}px ${Math.round(spread / 2)} ${hexToRgba("#020617", 0.34)}`;
  const boxShadow = ambientLayer ? `${shadow}, ${ambientShadow}` : shadow;
  const border = `1px solid ${hexToRgba(shadowColor, borderAlpha)}`;
  const backdropFilter = `blur(${backdropBlur}px) saturate(${saturation}%)`;
  const textShadow = textGlow > 0 ? `0 0 ${textGlow}px ${hexToRgba(shadowColor, 0.72)}` : "none";
  const css = `.effect-card {
  background: ${surface};
  border: ${border};
  border-radius: ${radius}px;
  box-shadow: ${boxShadow};
  backdrop-filter: ${backdropFilter};
  text-shadow: ${textShadow};
}`;
  const numericFields: Array<{
    label: string;
    value: number;
    setValue: (next: number) => void;
    step?: number;
  }> = [
    { label: "X", value: x, setValue: setX },
    { label: "Y", value: y, setValue: setY },
    { label: "Blur", value: blur, setValue: setBlur },
    { label: "Spread", value: spread, setValue: setSpread },
    { label: "Radius", value: radius, setValue: setRadius },
    { label: "Backdrop blur", value: backdropBlur, setValue: setBackdropBlur },
    { label: "Saturation", value: saturation, setValue: setSaturation },
    { label: "Text glow", value: textGlow, setValue: setTextGlow }
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
            <input type="number" step={field.step} value={field.value} onChange={(event) => field.setValue(Number(event.target.value))} />
          </label>
        ))}
        <label className="tool-field tool-field--compact">
          <span>Shadow color</span>
          <input value={shadowColor} onChange={(event) => setShadowColor(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Shadow picker</span>
          <input type="color" value={normalizeHexColor(shadowColor, "#0f766e")} onChange={(event) => setShadowColor(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Surface</span>
          <input value={surface} onChange={(event) => setSurface(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Surface picker</span>
          <input type="color" value={normalizeHexColor(surface, "#0d1824")} onChange={(event) => setSurface(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Shadow alpha</span>
          <input type="number" min="0" max="1" step="0.05" value={shadowAlpha} onChange={(event) => setShadowAlpha(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Border alpha</span>
          <input type="number" min="0" max="1" step="0.05" value={borderAlpha} onChange={(event) => setBorderAlpha(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyCss()}>复制 CSS</button>
      </div>

      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={ambientLayer} onChange={(event) => setAmbientLayer(event.target.checked)} />
          Ambient shadow layer
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={inset} onChange={(event) => setInset(event.target.checked)} />
          Inset shadow
        </label>
      </div>

      <div className="shadow-preview">
        <div
          style={{
            background: surface,
            border,
            borderRadius: radius,
            boxShadow,
            backdropFilter,
            color: "#e8eff7",
            textShadow
          }}
        >
          CSS Effects
        </div>
      </div>
      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
