"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

interface HarmonyGroup {
  name: string;
  description: string;
  colors: Rgb[];
}

function parseHex(input: string): Rgb {
  const v = input.trim().replace(/^#/, "");
  const n = v.length === 3 ? v.split("").map((p) => p + p).join("") : v;
  if (!/^[0-9a-fA-F]{6}$/.test(n)) throw new Error("请输入 3 位或 6 位 HEX");
  return { r: Number.parseInt(n.slice(0, 2), 16), g: Number.parseInt(n.slice(2, 4), 16), b: Number.parseInt(n.slice(4, 6), 16) };
}

function toHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === R) h = 60 * (((G - B) / d) % 6);
  else if (max === G) h = 60 * ((B - R) / d + 2);
  else h = 60 * ((R - G) / d + 4);
  return { h: Math.round((h + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const S = s / 100, L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = L - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
}

function hslStr(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function generateHarmonies(base: Rgb): HarmonyGroup[] {
  const hsl = rgbToHsl(base);
  const { h, s, l } = hsl;

  function atHue(deg: number): Rgb {
    return hslToRgb({ h: (h + deg + 360) % 360, s, l });
  }

  function atHsl(hue: number, sat: number, light: number): Rgb {
    return hslToRgb({ h: (h + hue + 360) % 360, s: Math.max(0, Math.min(100, s + sat)), l: Math.max(0, Math.min(100, l + light)) });
  }

  return [
    {
      name: "互补色",
      description: "180° 相对位置，产生最大对比",
      colors: [base, atHue(180)]
    },
    {
      name: "分裂互补色",
      description: "互补色相邻的两个颜色，对比柔和",
      colors: [base, atHue(150), atHue(210)]
    },
    {
      name: "邻近色",
      description: "30° 范围内的相邻色，色调统一",
      colors: [atHue(-30), base, atHue(30)]
    },
    {
      name: "三角色",
      description: "均匀分布 120°，均衡丰富",
      colors: [base, atHue(120), atHue(240)]
    },
    {
      name: "四角色",
      description: "两组互补色，层次丰富",
      colors: [base, atHue(60), atHue(180), atHue(240)]
    },
    {
      name: "方角色",
      description: "90° 均匀分布，四色均衡",
      colors: [base, atHue(90), atHue(180), atHue(270)]
    },
    {
      name: "单色系",
      description: "同一色相，通过明暗变化产生层次",
      colors: [atHsl(0, 0, -30), atHsl(0, 0, -15), base, atHsl(0, 0, 15), atHsl(0, 0, 30)]
    }
  ];
}

function getLuminance({ r, g, b }: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function textColor(rgb: Rgb): string {
  return getLuminance(rgb) > 0.55 ? "#081018" : "#f8fafc";
}

export default function ColorHarmoniesGeneratorTool({ manifest }: ToolAppProps) {
  const [hex, setHex] = useState("#6366f1");
  const [copied, setCopied] = useState("");

  let base: Rgb = { r: 99, g: 102, b: 241 };
  let groups: HarmonyGroup[] = [];
  let error = "";

  try {
    base = parseHex(hex);
    groups = generateHarmonies(base);
  } catch (e) {
    error = e instanceof Error ? e.message : "生成失败";
  }

  async function copy(val: string, label: string) {
    await navigator.clipboard.writeText(val);
    setCopied(label);
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
        <label className="tool-field tool-field--compact">
          <span>HEX</span>
          <input value={hex} onChange={(e) => { setHex(e.target.value); setCopied(""); }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色选择器</span>
          <input type="color" value={toHex(base)} onChange={(e) => { setHex(e.target.value); setCopied(""); }} />
        </label>
        <div className="detail-card" style={{ background: toHex(base), color: textColor(base), justifyContent: "center", textAlign: "center" }}>
          <strong>{toHex(base)}</strong>
        </div>
      </div>
      <div className="harmonies-container">
        {groups.map((group) => (
          <article key={group.name} className="harmony-group">
            <div className="harmony-header">
              <h3>{group.name}</h3>
              <p className="tool-note">{group.description}</p>
            </div>
            <div className="harmony-swatches">
              {group.colors.map((clr, i) => {
                const hexVal = toHex(clr);
                return (
                  <button
                    key={`${group.name}-${i}`}
                    type="button"
                    className="harmony-swatch"
                    style={{ background: hexVal, color: textColor(clr) }}
                    onClick={() => void copy(hexVal, `${group.name}-${i}`)}
                  >
                    <span className="harmony-swatch__label">{hexVal}</span>
                    <span className="harmony-swatch__action">{copied === `${group.name}-${i}` ? "已复制" : "复制"}</span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
