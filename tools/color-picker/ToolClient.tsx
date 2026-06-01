"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hslToHex({ h, s, l }: Hsl): string {
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
  const [r, g, b] = [r1, g1, b1].map((v) => Math.round((v + m) * 255));
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToHsl(hex: string): Hsl {
  const v = hex.trim().replace(/^#/, "");
  const n = v.length === 3 ? v.split("").map((p) => p + p).join("") : v;
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return { h: 0, s: 0, l: 0 };
  const r = Number.parseInt(n.slice(0, 2), 16) / 255;
  const g = Number.parseInt(n.slice(2, 4), 16) / 255;
  const b = Number.parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: Math.round((h + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getLuminance(hex: string) {
  const v = hex.replace("#", "");
  const r = Number.parseInt(v.slice(0, 2), 16);
  const g = Number.parseInt(v.slice(2, 4), 16);
  const b = Number.parseInt(v.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export default function ColorPickerTool({ manifest }: ToolClientProps) {
  const [hsl, setHsl] = useState<Hsl>({ h: 220, s: 100, l: 50 });
  const [hexInput, setHexInput] = useState("#3366ff");
  const [copied, setCopied] = useState("");
  const svRef = useRef<SVGSVGElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"sv" | "hue" | null>(null);

  const hex = hslToHex(hsl);
  const { h, s, l } = hsl;
  const textClr = getLuminance(hex) > 0.55 ? "#081018" : "#f8fafc";

  const activeHex = hexInput && /^#?[0-9a-fA-F]{3,6}$/.test(hexInput.trim().replace(/^#/, ""))
    ? (() => {
        const parsed = hexInput.trim().replace(/^#/, "");
        const n = parsed.length === 3 ? parsed.split("").map((p) => p + p).join("") : parsed;
        if (n.length === 6 && /^[0-9a-fA-F]{6}$/.test(n)) return "#" + n.toLowerCase();
        return null;
      })()
    : null;

  const updateFromSv = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setHsl((prev) => ({ ...prev, s: Math.round(x * 100), l: Math.round((1 - y) * 100) }));
    setHexInput("");
  }, []);

  const updateFromHue = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHsl((prev) => ({ ...prev, h: Math.round(x * 360) }));
    setHexInput("");
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging === "sv") updateFromSv(e.clientX, e.clientY);
    else if (dragging === "hue") updateFromHue(e.clientX);
  }, [dragging, updateFromSv, updateFromHue]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  function handleHexChange(value: string) {
    setHexInput(value);
    const parsed = value.trim().replace(/^#/, "");
    const n = parsed.length === 3 ? parsed.split("").map((p) => p + p).join("") : parsed;
    if (n.length === 6 && /^[0-9a-fA-F]{6}$/.test(n)) {
      setHsl(hexToHsl("#" + n));
    }
  }

  async function copy(val: string, label: string) {
    await navigator.clipboard.writeText(val);
    setCopied(label);
  }

  const rgb = `rgb(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(hex.slice(3, 5), 16)}, ${Number.parseInt(hex.slice(5, 7), 16)})`;
  const hslStr = `hsl(${h}, ${s}%, ${l}%)`;

  const indicatorX = `${s}%`;
  const indicatorY = `${100 - l}%`;
  const hueIndicatorLeft = `${(h / 360) * 100}%`;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="picker-layout">
        <div className="picker-canvas-area">
          <div className="picker-sv-container">
            <svg
              ref={svRef}
              className="picker-sv-canvas"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              onMouseDown={(e) => { setDragging("sv"); updateFromSv(e.clientX, e.clientY); }}
            >
              <defs>
                <linearGradient id="sv-white" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="white" />
                  <stop offset="100%" stopColor={`hsl(${h}, 100%, 50%)`} />
                </linearGradient>
                <linearGradient id="sv-black" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor="black" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="100" height="100" fill="url(#sv-white)" />
              <rect x="0" y="0" width="100" height="100" fill="url(#sv-black)" />
              <circle cx={s} cy={100 - l} r="4" fill="none" stroke={textClr} strokeWidth="1.5" />
            </svg>
          </div>
          <div
            ref={hueRef}
            className="picker-hue-slider"
            style={{ background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
            onMouseDown={(e) => { setDragging("hue"); updateFromHue(e.clientX); }}
          >
            <div className="picker-hue-thumb" style={{ left: hueIndicatorLeft }} />
          </div>
        </div>
        <div className="picker-controls">
          <div className="picker-preview" style={{ background: hex, color: textClr }}>
            <span className="picker-preview__hex">{hex}</span>
          </div>
          <div className="picker-sliders">
            <label className="tool-field tool-field--compact">
              <span>H {h}°</span>
              <input type="range" min={0} max={360} value={h} onChange={(e) => { setHsl((p) => ({ ...p, h: Number(e.target.value) })); setHexInput(""); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>S {s}%</span>
              <input type="range" min={0} max={100} value={s} onChange={(e) => { setHsl((p) => ({ ...p, s: Number(e.target.value) })); setHexInput(""); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>L {l}%</span>
              <input type="range" min={0} max={100} value={l} onChange={(e) => { setHsl((p) => ({ ...p, l: Number(e.target.value) })); setHexInput(""); }} />
            </label>
          </div>
          <label className="tool-field">
            <span>HEX</span>
            <input value={hexInput ?? hex} onChange={(e) => handleHexChange(e.target.value)} spellCheck={false} placeholder="#000000" />
          </label>
          <div className="picker-actions">
            <button type="button" onClick={() => void copy(hex, "hex")}>
              {copied === "hex" ? "已复制 HEX" : "复制 HEX"}
            </button>
            <button type="button" onClick={() => void copy(rgb, "rgb")}>
              {copied === "rgb" ? "已复制 RGB" : "复制 RGB"}
            </button>
            <button type="button" onClick={() => void copy(hslStr, "hsl")}>
              {copied === "hsl" ? "已复制 HSL" : "复制 HSL"}
            </button>
          </div>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>RGB</h3>
              <p>{rgb}</p>
            </article>
            <article className="detail-card">
              <h3>HSL</h3>
              <p>{hslStr}</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
