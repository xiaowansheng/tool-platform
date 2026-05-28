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
    throw new Error("请输入 3 位或 6 位 HEX 颜色。");
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function toHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance({ r, g, b }: Rgb) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));

  return (light + 0.05) / (dark + 0.05);
}

function normalizeHexInput(value: string) {
  try {
    return toHex(parseHex(value));
  } catch {
    return "#000000";
  }
}

function passLabel(pass: boolean) {
  return pass ? "Pass" : "Fail";
}

export default function ColorContrastCheckerTool({ manifest }: ToolClientProps) {
  const [foreground, setForeground] = useState("#e8eff7");
  const [background, setBackground] = useState("#0d1824");
  const [sampleSize, setSampleSize] = useState(18);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      const foregroundRgb = parseHex(foreground);
      const backgroundRgb = parseHex(background);
      const ratio = contrastRatio(foregroundRgb, backgroundRgb);

      return {
        error: "",
        ratio,
        ratioText: `${ratio.toFixed(2)}:1`,
        aaNormal: ratio >= 4.5,
        aaaNormal: ratio >= 7,
        aaLarge: ratio >= 3,
        aaaLarge: ratio >= 4.5,
        ui: ratio >= 3
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "颜色解析失败。",
        ratio: 0,
        ratioText: "0:1",
        aaNormal: false,
        aaaNormal: false,
        aaLarge: false,
        aaaLarge: false,
        ui: false
      };
    }
  }, [background, foreground]);

  const css = `color: ${normalizeHexInput(foreground)};\nbackground-color: ${normalizeHexInput(background)};`;

  async function copyCss() {
    await navigator.clipboard.writeText(css);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Accessibility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Foreground</span>
          <input value={foreground} onChange={(event) => setForeground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Foreground picker</span>
          <input type="color" value={normalizeHexInput(foreground)} onChange={(event) => setForeground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Background</span>
          <input value={background} onChange={(event) => setBackground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Background picker</span>
          <input type="color" value={normalizeHexInput(background)} onChange={(event) => setBackground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Sample size px</span>
          <input type="number" min="10" max="72" value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="contrast-preview" style={{ color: normalizeHexInput(foreground), backgroundColor: normalizeHexInput(background) }}>
        <strong style={{ fontSize: sampleSize }}>Readable interface text</strong>
        <p>Contrast ratio {result.ratioText}. WCAG large text starts at 18pt regular or 14pt bold.</p>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Ratio</h3>
          <p>{result.ratioText}</p>
        </article>
        <article className="detail-card">
          <h3>AA Text</h3>
          <p>{passLabel(result.aaNormal)}</p>
        </article>
        <article className="detail-card">
          <h3>AAA Text</h3>
          <p>{passLabel(result.aaaNormal)}</p>
        </article>
        <article className="detail-card">
          <h3>AA Large</h3>
          <p>{passLabel(result.aaLarge)}</p>
        </article>
        <article className="detail-card">
          <h3>AAA Large</h3>
          <p>{passLabel(result.aaaLarge)}</p>
        </article>
        <article className="detail-card">
          <h3>UI Graphics</h3>
          <p>{passLabel(result.ui)}</p>
        </article>
      </div>

      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>

      {result.error ? <p className="tool-error">{result.error}</p> : null}
    </section>
  );
}
