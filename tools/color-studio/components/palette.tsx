"use client";

import { useState, useEffect } from "react";
import { parseHex, toHex, type Rgb } from "../utils/color";

interface PaletteProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

function mix(color: Rgb, target: Rgb, weight: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * weight,
    g: color.g + (target.g - color.g) * weight,
    b: color.b + (target.b - color.b) * weight
  };
}

function luminance({ r, g, b }: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function swatchTextColor(rgb: Rgb) {
  return luminance(rgb) > 0.55 ? "#111" : "#fff";
}

function buildPalette(input: string) {
  const base = parseHex(input);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  return [
    { label: "50", color: toHex(mix(base, white, 0.88)) },
    { label: "100", color: toHex(mix(base, white, 0.74)) },
    { label: "200", color: toHex(mix(base, white, 0.58)) },
    { label: "300", color: toHex(mix(base, white, 0.38)) },
    { label: "400", color: toHex(mix(base, white, 0.18)) },
    { label: "500", color: toHex(base) },
    { label: "600", color: toHex(mix(base, black, 0.16)) },
    { label: "700", color: toHex(mix(base, black, 0.28)) },
    { label: "800", color: toHex(mix(base, black, 0.42)) },
    { label: "900", color: toHex(mix(base, black, 0.56)) }
  ];
}

export default function ColorPaletteTab({ activeColor, onChangeColor }: PaletteProps) {
  const [hex, setHex] = useState(activeColor);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  let baseRgb: Rgb = { r: 0, g: 0, b: 0 };
  let palette: Array<{ label: string; color: string }> = [];
  let error = "";

  try {
    baseRgb = parseHex(hex);
    palette = buildPalette(hex);
  } catch (paletteError) {
    error = paletteError instanceof Error ? paletteError.message : "颜色生成失败";
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

  async function copyColor(color: string) {
    try {
      await navigator.clipboard.writeText(color);
      setCopied(color);
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
          <span>基础 HEX 颜色</span>
          <input value={hex} onChange={(event) => handleHexChange(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>选择基础色</span>
          <input type="color" value={error ? "#000000" : hex} onChange={(event) => handleHexChange(event.target.value)} />
        </label>
      </div>
      <div className="palette-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem", margin: "20px 0" }}>
        {palette.map((item) => {
          const isBase = item.label === "500";
          const rgb = parseHex(item.color);
          const textClr = swatchTextColor(rgb);
          return (
            <button
              key={item.label}
              type="button"
              className="palette-swatch"
              style={{
                background: item.color,
                color: textClr,
                border: isBase ? "2.5px solid var(--text-primary)" : "1px solid rgba(0,0,0,0.08)",
                padding: "20px 10px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minHeight: "100px"
              }}
              onClick={() => {
                handleHexChange(item.color);
                void copyColor(item.color);
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: isBase ? "bold" : "normal" }}>{item.label}</span>
              <span style={{ fontSize: "0.75rem", fontFamily: "monospace", opacity: 0.9 }}>{copied === item.color ? "已复制" : item.color}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">输入基础颜色，自动生成从 50 到 900 的完整色阶。点击色块即可将其设为当前基础色并复制其 HEX 值。</p>
    </div>
  );
}
