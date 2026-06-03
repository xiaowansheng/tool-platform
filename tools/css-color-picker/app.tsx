"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type ColorFormat = "hex" | "rgb" | "hsl" | "rgba" | "hsla";

interface Hsl { h: number; s: number; l: number }

interface PaletteColor {
  name: string;
  hex: string;
}

interface PaletteGroup {
  label: string;
  colors: PaletteColor[];
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
  return "#" + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
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

function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16)
  };
}

function formatColor(hex: string, format: ColorFormat, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  switch (format) {
    case "hex": return hex;
    case "rgb": return `rgb(${r}, ${g}, ${b})`;
    case "rgba": return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    case "hsl": {
      const { h, s, l } = hexToHsl(hex);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    case "hsla": {
      const { h, s, l } = hexToHsl(hex);
      return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    }
  }
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const CSS_NAMED_GROUPS: PaletteGroup[] = [
  {
    label: "Reds", colors: [
      { name: "Indian Red", hex: "#cd5c5c" }, { name: "Light Coral", hex: "#f08080" },
      { name: "Salmon", hex: "#fa8072" }, { name: "Dark Salmon", hex: "#e9967a" },
      { name: "Light Salmon", hex: "#ffa07a" }, { name: "Red", hex: "#ff0000" },
      { name: "Crimson", hex: "#dc143c" }, { name: "Firebrick", hex: "#b22222" },
      { name: "Dark Red", hex: "#8b0000" }, { name: "Brown", hex: "#a52a2a" },
      { name: "Maroon", hex: "#800000" }
    ]
  },
  {
    label: "Oranges", colors: [
      { name: "Coral", hex: "#ff7f50" }, { name: "Tomato", hex: "#ff6347" },
      { name: "Orange Red", hex: "#ff4500" }, { name: "Dark Orange", hex: "#ff8c00" },
      { name: "Orange", hex: "#ffa500" }
    ]
  },
  {
    label: "Yellows", colors: [
      { name: "Gold", hex: "#ffd700" }, { name: "Yellow", hex: "#ffff00" },
      { name: "Light Yellow", hex: "#ffffe0" }, { name: "Lemon Chiffon", hex: "#fffacd" },
      { name: "Papaya Whip", hex: "#ffefd5" }, { name: "Moccasin", hex: "#ffe4b5" },
      { name: "Peach Puff", hex: "#ffdab9" }, { name: "Khaki", hex: "#f0e68c" },
      { name: "Dark Khaki", hex: "#bdb76b" }
    ]
  },
  {
    label: "Greens", colors: [
      { name: "Green Yellow", hex: "#adff2f" }, { name: "Chartreuse", hex: "#7fff00" },
      { name: "Lawn Green", hex: "#7cfc00" }, { name: "Lime", hex: "#00ff00" },
      { name: "Lime Green", hex: "#32cd32" }, { name: "Pale Green", hex: "#98fb98" },
      { name: "Light Green", hex: "#90ee90" }, { name: "Spring Green", hex: "#00ff7f" },
      { name: "Medium Sea Green", hex: "#3cb371" }, { name: "Sea Green", hex: "#2e8b57" },
      { name: "Forest Green", hex: "#228b22" }, { name: "Green", hex: "#008000" },
      { name: "Dark Green", hex: "#006400" }, { name: "Yellow Green", hex: "#9acd32" },
      { name: "Olive", hex: "#808000" }, { name: "Dark Olive Green", hex: "#556b2f" }
    ]
  },
  {
    label: "Cyans", colors: [
      { name: "Aqua", hex: "#00ffff" }, { name: "Cyan", hex: "#00ffff" },
      { name: "Light Cyan", hex: "#e0ffff" }, { name: "Pale Turquoise", hex: "#afeeee" },
      { name: "Aquamarine", hex: "#7fffd4" }, { name: "Turquoise", hex: "#40e0d0" },
      { name: "Medium Turquoise", hex: "#48d1cc" }, { name: "Dark Turquoise", hex: "#00ced1" },
      { name: "Light Sea Green", hex: "#20b2aa" }, { name: "Cadet Blue", hex: "#5f9ea0" },
      { name: "Dark Cyan", hex: "#008b8b" }, { name: "Teal", hex: "#008080" }
    ]
  },
  {
    label: "Blues", colors: [
      { name: "Powder Blue", hex: "#b0e0e6" }, { name: "Light Blue", hex: "#add8e6" },
      { name: "Sky Blue", hex: "#87ceeb" }, { name: "Light Sky Blue", hex: "#87cefa" },
      { name: "Deep Sky Blue", hex: "#00bfff" }, { name: "Dodger Blue", hex: "#1e90ff" },
      { name: "Cornflower Blue", hex: "#6495ed" }, { name: "Steel Blue", hex: "#4682b4" },
      { name: "Royal Blue", hex: "#4169e1" }, { name: "Blue", hex: "#0000ff" },
      { name: "Medium Blue", hex: "#0000cd" }, { name: "Dark Blue", hex: "#00008b" },
      { name: "Navy", hex: "#000080" }, { name: "Midnight Blue", hex: "#191970" }
    ]
  },
  {
    label: "Purples", colors: [
      { name: "Lavender", hex: "#e6e6fa" }, { name: "Thistle", hex: "#d8bfd8" },
      { name: "Plum", hex: "#dda0dd" }, { name: "Violet", hex: "#ee82ee" },
      { name: "Orchid", hex: "#da70d6" }, { name: "Fuchsia", hex: "#ff00ff" },
      { name: "Magenta", hex: "#ff00ff" }, { name: "Medium Orchid", hex: "#ba55d3" },
      { name: "Medium Purple", hex: "#9370db" }, { name: "Rebecca Purple", hex: "#663399" },
      { name: "Blue Violet", hex: "#8a2be2" }, { name: "Dark Violet", hex: "#9400d3" },
      { name: "Dark Orchid", hex: "#9932cc" }, { name: "Dark Magenta", hex: "#8b008b" },
      { name: "Purple", hex: "#800080" }, { name: "Indigo", hex: "#4b0082" }
    ]
  },
  {
    label: "Pinks", colors: [
      { name: "Pink", hex: "#ffc0cb" }, { name: "Light Pink", hex: "#ffb6c1" },
      { name: "Hot Pink", hex: "#ff69b4" }, { name: "Deep Pink", hex: "#ff1493" },
      { name: "Medium Violet Red", hex: "#c71585" }, { name: "Pale Violet Red", hex: "#db7093" }
    ]
  },
  {
    label: "Browns", colors: [
      { name: "Cornsilk", hex: "#fff8dc" }, { name: "Bisque", hex: "#ffe4c4" },
      { name: "Navajo White", hex: "#ffdead" }, { name: "Wheat", hex: "#f5deb3" },
      { name: "Burlywood", hex: "#deb887" }, { name: "Tan", hex: "#d2b48c" },
      { name: "Rosy Brown", hex: "#bc8f8f" }, { name: "Sandy Brown", hex: "#f4a460" },
      { name: "Goldenrod", hex: "#daa520" }, { name: "Dark Goldenrod", hex: "#b8860b" },
      { name: "Peru", hex: "#cd853f" }, { name: "Chocolate", hex: "#d2691e" },
      { name: "Saddle Brown", hex: "#8b4513" }, { name: "Sienna", hex: "#a0522d" }
    ]
  },
  {
    label: "Whites", colors: [
      { name: "White", hex: "#ffffff" }, { name: "Snow", hex: "#fffafa" },
      { name: "Honeydew", hex: "#f0fff0" }, { name: "Mint Cream", hex: "#f5fffa" },
      { name: "Azure", hex: "#f0ffff" }, { name: "Alice Blue", hex: "#f0f8ff" },
      { name: "Ghost White", hex: "#f8f8ff" }, { name: "White Smoke", hex: "#f5f5f5" },
      { name: "Seashell", hex: "#fff5ee" }, { name: "Beige", hex: "#f5f5dc" },
      { name: "Old Lace", hex: "#fdf5e6" }, { name: "Floral White", hex: "#fffaf0" },
      { name: "Ivory", hex: "#fffff0" }, { name: "Antique White", hex: "#faebd7" },
      { name: "Linen", hex: "#faf0e6" }, { name: "Lavender Blush", hex: "#fff0f5" },
      { name: "Misty Rose", hex: "#ffe4e1" }
    ]
  },
  {
    label: "Grays", colors: [
      { name: "Gainsboro", hex: "#dcdcdc" }, { name: "Light Gray", hex: "#d3d3d3" },
      { name: "Silver", hex: "#c0c0c0" }, { name: "Dark Gray", hex: "#a9a9a9" },
      { name: "Gray", hex: "#808080" }, { name: "Dim Gray", hex: "#696969" },
      { name: "Light Slate Gray", hex: "#778899" }, { name: "Slate Gray", hex: "#708090" },
      { name: "Dark Slate Gray", hex: "#2f4f4f" }
    ]
  }
];

const FLAT_UI_COLORS: PaletteColor[] = [
  { name: "Turquoise", hex: "#1abc9c" }, { name: "Green Sea", hex: "#16a085" },
  { name: "Emerald", hex: "#2ecc71" }, { name: "Nephritis", hex: "#27ae60" },
  { name: "Peter River", hex: "#3498db" }, { name: "Belize Hole", hex: "#2980b9" },
  { name: "Amethyst", hex: "#9b59b6" }, { name: "Wisteria", hex: "#8e44ad" },
  { name: "Wet Asphalt", hex: "#34495e" }, { name: "Midnight Blue", hex: "#2c3e50" },
  { name: "Sun Flower", hex: "#f1c40f" }, { name: "Orange", hex: "#f39c12" },
  { name: "Carrot", hex: "#e67e22" }, { name: "Pumpkin", hex: "#d35400" },
  { name: "Alizarin", hex: "#e74c3c" }, { name: "Pomegranate", hex: "#c0392b" },
  { name: "Clouds", hex: "#ecf0f1" }, { name: "Silver", hex: "#bdc3c7" },
  { name: "Concrete", hex: "#95a5a6" }, { name: "Asbestos", hex: "#7f8c8d" }
];

const SEMANTIC_COLORS: PaletteColor[] = [
  { name: "Success", hex: "#22c55e" }, { name: "Success Dark", hex: "#16a34a" },
  { name: "Warning", hex: "#f59e0b" }, { name: "Warning Dark", hex: "#d97706" },
  { name: "Error", hex: "#ef4444" }, { name: "Error Dark", hex: "#dc2626" },
  { name: "Info", hex: "#3b82f6" }, { name: "Info Dark", hex: "#2563eb" },
  { name: "Primary", hex: "#6366f1" }, { name: "Primary Dark", hex: "#4f46e5" },
  { name: "Muted", hex: "#6b7280" }, { name: "Background", hex: "#f9fafb" },
  { name: "Surface", hex: "#ffffff" }, { name: "Border", hex: "#e5e7eb" },
  { name: "Text Primary", hex: "#111827" }, { name: "Text Secondary", hex: "#6b7280" }
];

const TAILWIND_COLORS: PaletteColor[] = [
  { name: "Slate 50", hex: "#f8fafc" }, { name: "Slate 100", hex: "#f1f5f9" },
  { name: "Slate 200", hex: "#e2e8f0" }, { name: "Slate 300", hex: "#cbd5e1" },
  { name: "Slate 400", hex: "#94a3b8" }, { name: "Slate 500", hex: "#64748b" },
  { name: "Slate 600", hex: "#475569" }, { name: "Slate 700", hex: "#334155" },
  { name: "Slate 800", hex: "#1e293b" }, { name: "Slate 900", hex: "#0f172a" },
  { name: "Red 500", hex: "#ef4444" }, { name: "Red 600", hex: "#dc2626" },
  { name: "Orange 500", hex: "#f97316" }, { name: "Orange 600", hex: "#ea580c" },
  { name: "Amber 500", hex: "#f59e0b" }, { name: "Amber 600", hex: "#d97706" },
  { name: "Yellow 500", hex: "#eab308" }, { name: "Yellow 600", hex: "#ca8a04" },
  { name: "Lime 500", hex: "#84cc16" }, { name: "Lime 600", hex: "#65a30d" },
  { name: "Green 500", hex: "#22c55e" }, { name: "Green 600", hex: "#16a34a" },
  { name: "Emerald 500", hex: "#10b981" }, { name: "Emerald 600", hex: "#059669" },
  { name: "Teal 500", hex: "#14b8a6" }, { name: "Teal 600", hex: "#0d9488" },
  { name: "Cyan 500", hex: "#06b6d4" }, { name: "Cyan 600", hex: "#0891b2" },
  { name: "Sky 500", hex: "#0ea5e9" }, { name: "Sky 600", hex: "#0284c7" },
  { name: "Blue 500", hex: "#3b82f6" }, { name: "Blue 600", hex: "#2563eb" },
  { name: "Indigo 500", hex: "#6366f1" }, { name: "Indigo 600", hex: "#4f46e5" },
  { name: "Violet 500", hex: "#8b5cf6" }, { name: "Violet 600", hex: "#7c3aed" },
  { name: "Purple 500", hex: "#a855f7" }, { name: "Purple 600", hex: "#9333ea" },
  { name: "Fuchsia 500", hex: "#d946ef" }, { name: "Fuchsia 600", hex: "#c026d3" },
  { name: "Pink 500", hex: "#ec4899" }, { name: "Pink 600", hex: "#db2777" },
  { name: "Rose 500", hex: "#f43f5e" }, { name: "Rose 600", hex: "#e11d48" }
];

type PaletteTab = "css-named" | "flat-ui" | "semantic" | "tailwind";

export default function CssColorPickerTool({ manifest }: ToolAppProps) {
  const [hsl, setHsl] = useState<Hsl>({ h: 220, s: 100, l: 50 });
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [alpha, setAlpha] = useState(1);
  const [copied, setCopied] = useState("");
  const [activeTab, setActiveTab] = useState<"picker" | "palettes">("palettes");
  const [paletteTab, setPaletteTab] = useState<PaletteTab>("css-named");
  const svRef = useRef<SVGSVGElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"sv" | "hue" | null>(null);

  const hex = hslToHex(hsl);
  const { h, s, l } = hsl;
  const textClr = luminance(hex) > 0.55 ? "#081018" : "#f8fafc";
  const formatted = formatColor(hex, format, alpha);

  const updateFromSv = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setHsl((prev) => ({ ...prev, s: Math.round(x * 100), l: Math.round((1 - y) * 100) }));
  }, []);

  const updateFromHue = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHsl((prev) => ({ ...prev, h: Math.round(x * 360) }));
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

  async function copyColor(val: string, label: string) {
    await navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function renderSwatch(color: PaletteColor) {
    const lum = luminance(color.hex);
    const textColor = lum > 0.55 ? "#081018" : "#f8fafc";
    const val = formatColor(color.hex, format);
    return (
      <button key={color.hex + color.name} type="button"
        style={{
          background: color.hex, color: textColor,
          border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer",
          padding: "10px 6px", borderRadius: 6, textAlign: "center",
          fontFamily: "inherit", lineHeight: 1.4, fontSize: 11, minWidth: 0
        }}
        onClick={() => void copyColor(val, color.name)}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          {copied === color.name ? "已复制" : val}
        </span>
        <span style={{ display: "block", opacity: 0.75, wordBreak: "break-all" }}>{color.name}</span>
      </button>
    );
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

      <div className="tool-toolbar" style={{ gap: 0, marginBottom: 16 }}>
        <button type="button"
          className={activeTab === "picker" ? "button--primary" : ""}
          style={{ flex: 1, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}
          onClick={() => setActiveTab("picker")}>取色器</button>
        <button type="button"
          className={activeTab === "palettes" ? "button--primary" : ""}
          style={{ flex: 1, borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
          onClick={() => setActiveTab("palettes")}>色板库</button>
      </div>

      {activeTab === "picker" && (
        <>
          <div className="picker-layout">
            <div className="picker-canvas-area">
              <div className="picker-sv-container">
                <svg ref={svRef} className="picker-sv-canvas" viewBox="0 0 100 100" preserveAspectRatio="none"
                  onMouseDown={(e) => { setDragging("sv"); updateFromSv(e.clientX, e.clientY); }}>
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
              <div ref={hueRef} className="picker-hue-slider"
                style={{ background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
                onMouseDown={(e) => { setDragging("hue"); updateFromHue(e.clientX); }}>
                <div className="picker-hue-thumb" style={{ left: `${(h / 360) * 100}%` }} />
              </div>
            </div>
            <div className="picker-controls">
              <div className="picker-preview" style={{ background: hex, color: textClr }}>
                <span className="picker-preview__hex">{formatted}</span>
              </div>
              <div className="picker-sliders">
                <label className="tool-field tool-field--compact">
                  <span>H {h}°</span>
                  <input type="range" min={0} max={360} value={h}
                    onChange={(e) => setHsl((p) => ({ ...p, h: Number(e.target.value) }))} />
                </label>
                <label className="tool-field tool-field--compact">
                  <span>S {s}%</span>
                  <input type="range" min={0} max={100} value={s}
                    onChange={(e) => setHsl((p) => ({ ...p, s: Number(e.target.value) }))} />
                </label>
                <label className="tool-field tool-field--compact">
                  <span>L {l}%</span>
                  <input type="range" min={0} max={100} value={l}
                    onChange={(e) => setHsl((p) => ({ ...p, l: Number(e.target.value) }))} />
                </label>
              </div>
              <div className="tool-toolbar">
                <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                  <span>格式</span>
                  <select value={format} onChange={(e) => setFormat(e.target.value as ColorFormat)}>
                    <option value="hex">HEX</option>
                    <option value="rgb">RGB</option>
                    <option value="hsl">HSL</option>
                    <option value="rgba">RGBA</option>
                    <option value="hsla">HSLA</option>
                  </select>
                </label>
                {(format === "rgba" || format === "hsla") && (
                  <label className="tool-field tool-field--compact" style={{ flex: 0.6 }}>
                    <span>Alpha</span>
                    <input type="number" min={0} max={1} step={0.05} value={alpha}
                      onChange={(e) => setAlpha(Number(e.target.value))} />
                  </label>
                )}
              </div>
              <button type="button" onClick={() => void copyColor(formatted, "picker")}
                style={{ width: "100%", marginTop: 8 }}>
                {copied === "picker" ? "已复制" : `复制 ${format.toUpperCase()}`}
              </button>
            </div>
          </div>
          <p className="tool-note">在色板中拖拽选择颜色，或使用滑块微调。点击按钮复制当前颜色值。</p>
        </>
      )}

      {activeTab === "palettes" && (
        <>
          <div className="tool-toolbar" style={{ gap: 0, marginBottom: 16 }}>
            {(["css-named", "flat-ui", "semantic", "tailwind"] as PaletteTab[]).map((tab, i) => (
              <button key={tab} type="button"
                className={paletteTab === tab ? "button--primary" : ""}
                style={{
                  flex: 1,
                  borderRadius: 0,
                  borderTopLeftRadius: i === 0 ? 6 : 0,
                  borderBottomLeftRadius: i === 0 ? 6 : 0,
                  borderTopRightRadius: i === 3 ? 6 : 0,
                  borderBottomRightRadius: i === 3 ? 6 : 0
                }}
                onClick={() => setPaletteTab(tab)}>
                {tab === "css-named" ? "CSS 命名色" : tab === "flat-ui" ? "Flat UI" : tab === "semantic" ? "语义色" : "Tailwind"}
              </button>
            ))}
          </div>

          <div className="tool-toolbar tool-toolbar--inline">
            <label className="tool-field tool-field--compact">
              <span>复制格式</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as ColorFormat)}>
                <option value="hex">HEX</option>
                <option value="rgb">RGB</option>
                <option value="hsl">HSL</option>
                <option value="rgba">RGBA</option>
                <option value="hsla">HSLA</option>
              </select>
            </label>
          </div>

          {paletteTab === "css-named" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {CSS_NAMED_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>{group.label}</p>
                  <div className="palette-grid">
                    {group.colors.map(renderSwatch)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {paletteTab === "flat-ui" && (
            <div>
              <p className="tool-note" style={{ marginBottom: 12 }}>Flat UI 经典配色</p>
              <div className="palette-grid">
                {FLAT_UI_COLORS.map(renderSwatch)}
              </div>
            </div>
          )}

          {paletteTab === "semantic" && (
            <div>
              <p className="tool-note" style={{ marginBottom: 12 }}>UI 语义色 — 常用于状态指示</p>
              <div className="palette-grid">
                {SEMANTIC_COLORS.map(renderSwatch)}
              </div>
            </div>
          )}

          {paletteTab === "tailwind" && (
            <div>
              <p className="tool-note" style={{ marginBottom: 12 }}>Tailwind CSS 常用色板</p>
              <div className="palette-grid">
                {TAILWIND_COLORS.map(renderSwatch)}
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">所有颜色值在本地生成，点击色块即可按所选格式复制。</p>
    </section>
  );
}
