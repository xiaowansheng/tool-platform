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

export default function ColorPaletteTab({ activeColor, onChangeColor }: PaletteProps) {
  const [hex, setHex] = useState(activeColor);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  let palette: Array<{ label: string; color: string }> = [];
  let error = "";

  try {
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
      <div className="palette-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "1rem", margin: "20px 0" }}>
        {palette.map((item) => {
          const isBase = item.label === "500";
          return (
            <button
              key={item.label}
              type="button"
              className="palette-swatch"
              style={{
                background: item.color,
                border: isBase ? "2.5px solid var(--text-primary)" : "1px solid rgba(0,0,0,0.08)",
                padding: "20px 10px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                minHeight: "110px"
              }}
              onClick={() => {
                handleHexChange(item.color);
                void copyColor(item.color);
              }}
            >
              <span style={{ fontSize: "0.8rem", opacity: 0.8, color: "inherit", fontWeight: isBase ? "bold" : "normal" }}>{item.label} {isBase ? "(基色)" : ""}</span>
              <strong style={{ fontSize: "0.85rem" }}>{copied === item.color ? "已复制" : item.color}</strong>
            </button>
          );
        })}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">输入基础颜色，自动生成从 50 到 900 的色阶。点击色块即可将其设为当前基础色，并复制其 HEX 值。</p>
    </div>
  );
}
