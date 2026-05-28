"use client";

import { useMemo, useState } from "react";

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
    throw new Error("请输入 3 位或 6 位 HEX。");
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

function buildScale(hex: string) {
  const base = parseHex(hex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  return [
    ["50", toHex(mix(base, white, 0.88))],
    ["100", toHex(mix(base, white, 0.74))],
    ["200", toHex(mix(base, white, 0.58))],
    ["300", toHex(mix(base, white, 0.38))],
    ["400", toHex(mix(base, white, 0.18))],
    ["500", toHex(base)],
    ["600", toHex(mix(base, black, 0.16))],
    ["700", toHex(mix(base, black, 0.28))],
    ["800", toHex(mix(base, black, 0.42))],
    ["900", toHex(mix(base, black, 0.56))]
  ] as Array<[string, string]>;
}

function normalizeHexColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function GradientGeneratorTool({ manifest }: ToolClientProps) {
  const [from, setFrom] = useState("#0f766e");
  const [to, setTo] = useState("#38bdf8");
  const [accent, setAccent] = useState("#fbbf24");
  const [surface, setSurface] = useState("#0d1824");
  const [text, setText] = useState("#e8eff7");
  const [angle, setAngle] = useState(135);
  const [tokenPrefix, setTokenPrefix] = useState("brand");
  const [copied, setCopied] = useState(false);
  const gradient = `linear-gradient(${angle}deg, ${from}, ${to})`;

  const tokenResult = useMemo(() => {
    try {
      const primaryScale = buildScale(from);
      const secondaryScale = buildScale(to);
      const accentScale = buildScale(accent);
      const css = [
        ":root {",
        ...primaryScale.map(([step, color]) => `  --color-${tokenPrefix}-primary-${step}: ${color};`),
        ...secondaryScale.map(([step, color]) => `  --color-${tokenPrefix}-secondary-${step}: ${color};`),
        ...accentScale.map(([step, color]) => `  --color-${tokenPrefix}-accent-${step}: ${color};`),
        `  --color-${tokenPrefix}-surface: ${surface};`,
        `  --color-${tokenPrefix}-text: ${text};`,
        `  --gradient-${tokenPrefix}: ${gradient};`,
        "}"
      ].join("\n");

      return {
        css,
        error: "",
        swatches: [
          ...primaryScale.map(([step, color]) => ({ label: `P ${step}`, color })),
          ...secondaryScale.map(([step, color]) => ({ label: `S ${step}`, color })),
          ...accentScale.map(([step, color]) => ({ label: `A ${step}`, color }))
        ]
      };
    } catch (error) {
      return {
        css: "",
        error: error instanceof Error ? error.message : "Theme token 生成失败。",
        swatches: [] as Array<{ label: string; color: string }>
      };
    }
  }, [accent, from, gradient, surface, text, to, tokenPrefix]);

  async function copyCss() {
    await navigator.clipboard.writeText(tokenResult.css);
    setCopied(true);
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
          <span>From picker</span>
          <input type="color" value={normalizeHexColor(from, "#0f766e")} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>To</span>
          <input value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>To picker</span>
          <input type="color" value={normalizeHexColor(to, "#38bdf8")} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Accent</span>
          <input value={accent} onChange={(event) => setAccent(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Accent picker</span>
          <input type="color" value={normalizeHexColor(accent, "#fbbf24")} onChange={(event) => setAccent(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Surface</span>
          <input value={surface} onChange={(event) => setSurface(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Text</span>
          <input value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Angle</span>
          <input type="number" value={angle} onChange={(event) => setAngle(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Token prefix</span>
          <input value={tokenPrefix} onChange={(event) => setTokenPrefix(event.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())} />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 Tokens"}</button>
      </div>

      <div className="theme-preview" style={{ background: gradient, color: text }}>
        <strong>Gradient theme</strong>
        <p style={{ color: text }}>Primary, secondary, accent, surface and text tokens.</p>
      </div>

      <div className="palette-grid">
        {tokenResult.swatches.map((item) => (
          <button key={`${item.label}-${item.color}`} type="button" className="palette-swatch" style={{ background: item.color }}>
            <span>{item.label}</span>
            <strong>{item.color}</strong>
          </button>
        ))}
      </div>

      <label className="tool-field">
        <span>CSS theme tokens</span>
        <textarea value={tokenResult.css} readOnly spellCheck={false} />
      </label>
      {tokenResult.error ? <p className="tool-error">{tokenResult.error}</p> : null}
    </section>
  );
}
