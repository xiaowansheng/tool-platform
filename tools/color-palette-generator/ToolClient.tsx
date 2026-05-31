"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(input: string): Rgb {
  const value = input.trim().replace(/^#/, "");
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error("请输入 3 位或 6 位 HEX");
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function toHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mix(color: Rgb, target: Rgb, weight: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * weight,
    g: color.g + (target.g - color.g) * weight,
    b: color.b + (target.b - color.b) * weight
  };
}

function buildPalette(input: string) {
  const base = parseHex(input);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  return [
    { label: "50", color: toHex(mix(base, white, 0.86)) },
    { label: "100", color: toHex(mix(base, white, 0.72)) },
    { label: "200", color: toHex(mix(base, white, 0.52)) },
    { label: "300", color: toHex(mix(base, white, 0.32)) },
    { label: "500", color: toHex(base) },
    { label: "700", color: toHex(mix(base, black, 0.22)) },
    { label: "900", color: toHex(mix(base, black, 0.46)) }
  ];
}

export default function ColorPaletteGeneratorTool({ manifest }: ToolClientProps) {
  const [hex, setHex] = useState("#14b8a6");
  const [copied, setCopied] = useState("");

  let palette: Array<{ label: string; color: string }> = [];
  let error = "";

  try {
    palette = buildPalette(hex);
  } catch (paletteError) {
    error = paletteError instanceof Error ? paletteError.message : "颜色生成失败";
  }

  async function copyColor(color: string) {
    await navigator.clipboard.writeText(color);
    setCopied(color);
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
      <label className="tool-field">
        <span>HEX</span>
        <input value={hex} onChange={(event) => setHex(event.target.value)} />
      </label>
      <div className="palette-grid">
        {palette.map((item) => (
          <button
            key={item.label}
            type="button"
            className="palette-swatch"
            style={{ background: item.color }}
            onClick={() => void copyColor(item.color)}
          >
            <span>{item.label}</span>
            <strong>{copied === item.color ? "已复制" : item.color}</strong>
          </button>
        ))}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
