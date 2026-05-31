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
  return "#" + [r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("");
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

function getLuminance({ r, g, b }: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export default function ColorConverterTool({ manifest }: ToolClientProps) {
  const [hex, setHex] = useState("#5eead4");
  const [copied, setCopied] = useState("");
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

  const normalizedHex = error ? "" : toHex(rgb);
  const hsl = toHsl(rgb);
  const rgbValue = error ? "" : "rgb(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ")";
  const hslValue = error ? "" : "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
  const previewTextColor = getLuminance(rgb) > 0.58 ? "#081018" : "#f8fafc";

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">颜色调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>HEX 输入</span>
          <input value={hex} onChange={(event) => { setHex(event.target.value); setCopied(""); }} spellCheck={false} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色选择器</span>
          <input type="color" value={normalizedHex || "#000000"} onChange={(event) => { setHex(event.target.value); setCopied(""); }} />
        </label>
        <button type="button" onClick={() => void copyValue("hex", normalizedHex)} disabled={Boolean(error)}>
          {copied === "hex" ? "已复制 HEX" : "复制 HEX"}
        </button>
        <button type="button" onClick={() => void copyValue("rgb", rgbValue)} disabled={Boolean(error)}>
          {copied === "rgb" ? "已复制 RGB" : "复制 RGB"}
        </button>
        <button type="button" onClick={() => void copyValue("hsl", hslValue)} disabled={Boolean(error)}>
          {copied === "hsl" ? "已复制 HSL" : "复制 HSL"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card" style={{ background: normalizedHex || "var(--bg-inset)", color: previewTextColor }}>
          <h3 style={{ color: previewTextColor }}>预览</h3>
          <p style={{ color: previewTextColor }}>{normalizedHex || "待修正"}</p>
        </article>
        <article className="detail-card">
          <h3>RGB</h3>
          <p>{rgbValue || "待修正"}</p>
        </article>
        <article className="detail-card">
          <h3>HSL</h3>
          <p>{hslValue || "待修正"}</p>
        </article>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">当前工具接受 3 位或 6 位 HEX；如果要处理透明度，可先把 alpha 单独记录为 opacity 或 rgba 的第四个值。</p>
    </section>
  );
}
