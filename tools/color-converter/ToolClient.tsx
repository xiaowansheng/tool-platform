"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(input: string): Rgb {
  const normalized = input.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("请输入 3 位或 6 位 HEX 颜色");
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function toHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("")}`;
}

function toHsl({ r, g, b }: Rgb) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return {
      h: 0,
      s: 0,
      l: Math.round(lightness * 100)
    };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  return {
    h: Math.round((hue + 360) % 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

export default function ColorConverterTool({ manifest }: ToolClientProps) {
  const [hex, setHex] = useState("#5eead4");
  let error = "";
  let rgb: Rgb = {
    r: 94,
    g: 234,
    b: 212
  };

  try {
    rgb = parseHex(hex);
  } catch (parseError) {
    error = parseError instanceof Error ? parseError.message : "颜色转换失败";
  }

  const normalizedHex = toHex(rgb);
  const hsl = toHsl(rgb);

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
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
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>HEX</span>
          <input value={hex} onChange={(event) => setHex(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyValue(normalizedHex)}>
          复制 HEX
        </button>
        <button type="button" onClick={() => void copyValue(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}>
          复制 RGB
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card color-preview" style={{ background: normalizedHex }}>
          <h3>Preview</h3>
          <p>{normalizedHex}</p>
        </article>
        <article className="detail-card">
          <h3>RGB</h3>
          <p>{`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}</p>
        </article>
        <article className="detail-card">
          <h3>HSL</h3>
          <p>{`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`}</p>
        </article>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
