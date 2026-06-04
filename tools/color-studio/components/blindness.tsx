"use client";

import { useState, useEffect } from "react";
import { parseHex, toHex, swatchTextColor, type Rgb } from "../utils/color";

interface BlindnessProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

interface Simulation {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

const SIMULATIONS: Simulation[] = [
  { id: "normal", label: "正常视觉", shortLabel: "正常", description: "标准 RGB 显示" },
  { id: "protanopia", label: "红色盲 (Protanopia)", shortLabel: "红色盲", description: "L 锥体缺失，约 1% 男性" },
  { id: "deuteranopia", label: "绿色盲 (Deuteranopia)", shortLabel: "绿色盲", description: "M 锥体缺失，约 1% 男性" },
  { id: "tritanopia", label: "蓝色盲 (Tritanopia)", shortLabel: "蓝色盲", description: "S 锥体缺失，罕见" },
  { id: "achromatopsia", label: "全色盲 (Achromatopsia)", shortLabel: "全色盲", description: "完全无法感知颜色" }
];

function clamp(val: number): number {
  return Math.max(0, Math.min(255, Math.round(val)));
}

function simulate(c: Rgb, type: string): Rgb {
  const { r, g, b } = c;
  const rr = r / 255, gg = g / 255, bb = b / 255;

  if (type === "normal") return c;

  if (type === "achromatopsia") {
    const gray = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    return { r: clamp(gray * 255), g: clamp(gray * 255), b: clamp(gray * 255) };
  }

  let sr = rr, sg = gg, sb = bb;

  if (type === "protanopia") {
    sr = 0.567 * rr + 0.433 * gg + 0 * bb;
    sg = 0.558 * rr + 0.442 * gg + 0 * bb;
    sb = 0 * rr + 0.242 * gg + 0.758 * bb;
  } else if (type === "deuteranopia") {
    sr = 0.625 * rr + 0.375 * gg + 0 * bb;
    sg = 0.7 * rr + 0.3 * gg + 0 * bb;
    sb = 0 * rr + 0.3 * gg + 0.7 * bb;
  } else if (type === "tritanopia") {
    sr = 0.95 * rr + 0.05 * gg + 0 * bb;
    sg = 0 * rr + 0.433 * gg + 0.567 * bb;
    sb = 0 * rr + 0.475 * gg + 0.525 * bb;
  }

  return { r: clamp(sr * 255), g: clamp(sg * 255), b: clamp(sb * 255) };
}

export default function ColorBlindnessTab({ activeColor, onChangeColor }: BlindnessProps) {
  const [hex, setHex] = useState(activeColor);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  let base: Rgb = { r: 99, g: 102, b: 241 };
  let error = "";

  try {
    base = parseHex(hex);
  } catch (e) {
    error = e instanceof Error ? e.message : "解析失败";
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

  async function handleCopy(val: string, label: string) {
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
          <span>颜色 HEX</span>
          <input value={hex} onChange={(e) => handleHexChange(e.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>选择颜色</span>
          <input type="color" value={toHex(base)} onChange={(e) => handleHexChange(e.target.value)} />
        </label>
      </div>

      {/* Quick comparison strip */}
      {!error && (
        <div style={{ margin: "16px 0", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-default)" }}>
          <div style={{ display: "flex" }}>
            {SIMULATIONS.map((sim) => {
              const result = simulate(base, sim.id);
              const hexVal = toHex(result);
              const textClr = swatchTextColor(result);
              return (
                <div
                  key={sim.id}
                  style={{
                    flex: 1,
                    background: hexVal,
                    color: textClr,
                    padding: "12px 4px",
                    textAlign: "center",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    borderRight: sim.id !== "achromatopsia" ? "1px solid rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  {sim.shortLabel}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="simulation-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" }}>
        {SIMULATIONS.map((sim) => {
          const result = simulate(base, sim.id);
          const hexVal = toHex(result);
          const textClr = swatchTextColor(result);
          const isOriginal = sim.id === "normal";
          return (
            <article key={sim.id} className="simulation-card" style={{
              background: "var(--bg-card)",
              border: isOriginal ? "2px solid var(--accent-primary)" : "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div className="simulation-preview" style={{ background: hexVal, color: textClr, height: "100px", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", position: "relative" }}>
                {isOriginal && (
                  <span style={{ position: "absolute", top: "6px", right: "6px", fontSize: "0.6rem", background: "rgba(0,0,0,0.4)", color: "#fff", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>原始色</span>
                )}
                <span className="simulation-hex" style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "1.1rem" }}>{hexVal}</span>
                <button
                  type="button"
                  style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    handleHexChange(hexVal);
                    void handleCopy(hexVal, sim.id);
                  }}
                >
                  {copied === sim.id ? "已复制" : "选择并复制"}
                </button>
              </div>
              <div className="simulation-info">
                <h3 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: "bold" }}>{sim.label}</h3>
                <p className="tool-note" style={{ margin: 0, fontSize: "0.75rem" }}>{sim.description}</p>
              </div>
            </article>
          );
        })}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </div>
  );
}
