"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

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

export default function BoxShadowGeneratorTool({ manifest }: ToolAppProps) {
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
  const [copied, setCopied] = useState(false);
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
    { label: "模糊", value: blur, setValue: setBlur },
    { label: "扩散", value: spread, setValue: setSpread },
    { label: "圆角", value: radius, setValue: setRadius },
    { label: "背景模糊", value: backdropBlur, setValue: setBackdropBlur },
    { label: "饱和度", value: saturation, setValue: setSaturation },
    { label: "文字发光", value: textGlow, setValue: setTextGlow }
  ];

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
    } catch {
      setCopied(false);
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
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
          <span>阴影颜色</span>
          <input value={shadowColor} onChange={(event) => setShadowColor(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>阴影取色</span>
          <input type="color" value={normalizeHexColor(shadowColor, "#0f766e")} onChange={(event) => setShadowColor(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>卡片背景</span>
          <input value={surface} onChange={(event) => setSurface(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景取色</span>
          <input type="color" value={normalizeHexColor(surface, "#0d1824")} onChange={(event) => setSurface(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>阴影透明度</span>
          <input type="number" min="0" max="1" step="0.05" value={shadowAlpha} onChange={(event) => setShadowAlpha(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>边框透明度</span>
          <input type="number" min="0" max="1" step="0.05" value={borderAlpha} onChange={(event) => setBorderAlpha(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={ambientLayer} onChange={(event) => setAmbientLayer(event.target.checked)} />
          环境阴影层
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={inset} onChange={(event) => setInset(event.target.checked)} />
          内阴影
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
          CSS 效果
        </div>
      </div>
      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
      <p className="tool-note">支持多层阴影、内阴影、背景模糊和文字发光效果，实时预览并生成 CSS 代码。</p>
    </section>
  );
}
