"use client";

import { useState, useEffect } from "react";
import {
  parseHex,
  toHex,
  toHsl,
  hslToRgb,
  getLuminance,
  type Rgb
} from "../utils/color";

interface HarmoniesProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

interface HarmonyGroup {
  name: string;
  description: string;
  colors: Rgb[];
}

function generateHarmonies(base: Rgb): HarmonyGroup[] {
  const hsl = toHsl(base);
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

function textColor(rgb: Rgb): string {
  return getLuminance(rgb) > 0.55 ? "#081018" : "#f8fafc";
}

export default function ColorHarmoniesTab({ activeColor, onChangeColor }: HarmoniesProps) {
  const [hex, setHex] = useState(activeColor);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  let base: Rgb = { r: 99, g: 102, b: 241 };
  let groups: HarmonyGroup[] = [];
  let error = "";

  try {
    base = parseHex(hex);
    groups = generateHarmonies(base);
  } catch (e) {
    error = e instanceof Error ? e.message : "生成失败";
  }

  const handleHexChange = (val: string) => {
    setHex(val);
    try {
      const parsed = parseHex(val);
      onChangeColor(toHex(parsed));
    } catch {
      // Allow invalid typing
    }
  };

  async function copy(val: string, label: string) {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(label);
    } catch {
      setCopied("");
    } finally {
      setTimeout(() => setCopied(""), 2000);
    }
  }

  return (
    <div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>基础 HEX</span>
          <input value={hex} onChange={(e) => handleHexChange(e.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色选择器</span>
          <input type="color" value={toHex(base)} onChange={(e) => handleHexChange(e.target.value)} />
        </label>
        <div className="detail-card" style={{ background: toHex(base), color: textColor(base), justifyContent: "center", textAlign: "center", minHeight: "auto", padding: "10px" }}>
          <strong>基色: {toHex(base)}</strong>
        </div>
      </div>

      <div className="harmonies-container" style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "20px" }}>
        {groups.map((group) => (
          <article key={group.name} className="harmony-group" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
            <div className="harmony-header" style={{ marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>{group.name}</h3>
              <p className="tool-note" style={{ margin: 0 }}>{group.description}</p>
            </div>
            <div className="harmony-swatches" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {group.colors.map((clr, i) => {
                const hexVal = toHex(clr);
                return (
                  <button
                    key={`${group.name}-${i}`}
                    type="button"
                    className="harmony-swatch"
                    style={{
                      background: hexVal,
                      color: textColor(clr),
                      border: "1px solid rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      padding: "16px 12px",
                      borderRadius: "var(--radius-md)",
                      flex: 1,
                      minWidth: "100px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    onClick={() => {
                      handleHexChange(hexVal);
                      void copy(hexVal, `${group.name}-${i}`);
                    }}
                  >
                    <strong style={{ fontSize: "0.85rem" }}>{hexVal}</strong>
                    <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>
                      {copied === `${group.name}-${i}` ? "已复制" : "点击选择"}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </div>
  );
}
