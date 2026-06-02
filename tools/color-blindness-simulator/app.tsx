"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Simulation {
  id: string;
  label: string;
  description: string;
}

const SIMULATIONS: Simulation[] = [
  { id: "normal", label: "正常视觉", description: "标准 RGB 显示" },
  { id: "protanopia", label: "红色盲 (Protanopia)", description: "L 锥体缺失，约 1% 男性" },
  { id: "deuteranopia", label: "绿色盲 (Deuteranopia)", description: "M 锥体缺失，约 1% 男性" },
  { id: "tritanopia", label: "蓝色盲 (Tritanopia)", description: "S 锥体缺失，罕见" },
  { id: "achromatopsia", label: "全色盲 (Achromatopsia)", description: "完全无法感知颜色" }
];

function parseHex(input: string): Rgb {
  const v = input.trim().replace(/^#/, "");
  const n = v.length === 3 ? v.split("").map((p) => p + p).join("") : v;
  if (!/^[0-9a-fA-F]{6}$/.test(n)) throw new Error("请输入 3 位或 6 位 HEX");
  return { r: Number.parseInt(n.slice(0, 2), 16), g: Number.parseInt(n.slice(2, 4), 16), b: Number.parseInt(n.slice(4, 6), 16) };
}

function toHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

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

function getLuminance({ r, g, b }: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export default function ColorBlindnessSimulatorTool({ manifest }: ToolAppProps) {
  const [hex, setHex] = useState("#6366f1");
  const [copied, setCopied] = useState("");

  let base: Rgb = { r: 99, g: 102, b: 241 };
  let error = "";

  try {
    base = parseHex(hex);
  } catch (e) {
    error = e instanceof Error ? e.message : "解析失败";
  }

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
      </div>
      <div className="simulation-grid">
        {SIMULATIONS.map((sim) => {
          const result = simulate(base, sim.id);
          const hexVal = toHex(result);
          const textClr = getLuminance(result) > 0.55 ? "#081018" : "#f8fafc";
          return (
            <article key={sim.id} className="simulation-card">
              <div className="simulation-preview" style={{ background: hexVal, color: textClr }}>
                <span className="simulation-hex">{hexVal}</span>
                <button
                  type="button"
                  className="simulation-copy"
                  onClick={() => void handleCopy(hexVal, sim.id)}
                >
                  {copied === sim.id ? "已复制" : "复制"}
                </button>
              </div>
              <div className="simulation-info">
                <h3>{sim.label}</h3>
                <p className="tool-note">{sim.description}</p>
              </div>
            </article>
          );
        })}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
