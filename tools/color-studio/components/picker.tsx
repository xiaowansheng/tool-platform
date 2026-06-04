"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  hexToHsl,
  hslToHex,
  hslToHsv,
  hsvToHsl,
  formatColor,
  getLuminance,
  parseHex,
  toHex,
  type Hsl,
  type ColorFormat
} from "../utils/color";

interface PickerProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

interface PaletteColor {
  name: string;
  hex: string;
}

interface PaletteGroup {
  label: string;
  colors: PaletteColor[];
}

const CSS_NAMED_GROUPS: PaletteGroup[] = [
  {
    label: "红粉色系", colors: [
      { name: "Indian Red", hex: "#cd5c5c" }, { name: "Light Coral", hex: "#f08080" },
      { name: "Salmon", hex: "#fa8072" }, { name: "Dark Salmon", hex: "#e9967a" },
      { name: "Light Salmon", hex: "#ffa07a" }, { name: "Red", hex: "#ff0000" },
      { name: "Crimson", hex: "#dc143c" }, { name: "Firebrick", hex: "#b22222" },
      { name: "Dark Red", hex: "#8b0000" }, { name: "Brown", hex: "#a52a2a" },
      { name: "Maroon", hex: "#800000" }
    ]
  },
  {
    label: "橙黄系", colors: [
      { name: "Coral", hex: "#ff7f50" }, { name: "Tomato", hex: "#ff6347" },
      { name: "Orange Red", hex: "#ff4500" }, { name: "Dark Orange", hex: "#ff8c00" },
      { name: "Orange", hex: "#ffa500" }, { name: "Gold", hex: "#ffd700" }, 
      { name: "Yellow", hex: "#ffff00" }, { name: "Light Yellow", hex: "#ffffe0" }
    ]
  },
  {
    label: "绿色系", colors: [
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
    label: "蓝青色系", colors: [
      { name: "Aqua", hex: "#00ffff" }, { name: "Cyan", hex: "#00ffff" },
      { name: "Light Cyan", hex: "#e0ffff" }, { name: "Pale Turquoise", hex: "#afeeee" },
      { name: "Aquamarine", hex: "#7fffd4" }, { name: "Turquoise", hex: "#40e0d0" },
      { name: "Medium Turquoise", hex: "#48d1cc" }, { name: "Dark Turquoise", hex: "#00ced1" },
      { name: "Teal", hex: "#008080" }, { name: "Deep Sky Blue", hex: "#00bfff" }, 
      { name: "Dodger Blue", hex: "#1e90ff" }, { name: "Royal Blue", hex: "#4169e1" }, 
      { name: "Blue", hex: "#0000ff" }, { name: "Navy", hex: "#000080" }
    ]
  },
  {
    label: "紫粉色系", colors: [
      { name: "Lavender", hex: "#e6e6fa" }, { name: "Thistle", hex: "#d8bfd8" },
      { name: "Plum", hex: "#dda0dd" }, { name: "Violet", hex: "#ee82ee" },
      { name: "Orchid", hex: "#da70d6" }, { name: "Fuchsia", hex: "#ff00ff" },
      { name: "Magenta", hex: "#ff00ff" }, { name: "Purple", hex: "#800080" }, 
      { name: "Indigo", hex: "#4b0082" }, { name: "Hot Pink", hex: "#ff69b4" }
    ]
  },
  {
    label: "中性色系（灰白黑）", colors: [
      { name: "White", hex: "#ffffff" }, { name: "White Smoke", hex: "#f5f5f5" },
      { name: "Gainsboro", hex: "#dcdcdc" }, { name: "Light Gray", hex: "#d3d3d3" },
      { name: "Silver", hex: "#c0c0c0" }, { name: "Gray", hex: "#808080" },
      { name: "Dim Gray", hex: "#696969" }, { name: "Dark Slate Gray", hex: "#2f4f4f" },
      { name: "Black", hex: "#000000" }
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
  { name: "Success (成功)", hex: "#22c55e" }, { name: "Success Dark", hex: "#16a34a" },
  { name: "Warning (警告)", hex: "#f59e0b" }, { name: "Warning Dark", hex: "#d97706" },
  { name: "Error (错误)", hex: "#ef4444" }, { name: "Error Dark", hex: "#dc2626" },
  { name: "Info (信息)", hex: "#3b82f6" }, { name: "Info Dark", hex: "#2563eb" },
  { name: "Primary (主色)", hex: "#6366f1" }, { name: "Primary Dark", hex: "#4f46e5" },
  { name: "Muted (禁用/次要)", hex: "#6b7280" }
];

const TAILWIND_COLORS: PaletteColor[] = [
  { name: "Slate 500", hex: "#64748b" }, { name: "Slate 700", hex: "#334155" },
  { name: "Red 500", hex: "#ef4444" }, { name: "Red 600", hex: "#dc2626" },
  { name: "Orange 500", hex: "#f97316" }, { name: "Orange 600", hex: "#ea580c" },
  { name: "Amber 500", hex: "#f59e0b" }, { name: "Yellow 500", hex: "#eab308" },
  { name: "Lime 500", hex: "#84cc16" }, { name: "Green 500", hex: "#22c55e" },
  { name: "Emerald 500", hex: "#10b981" }, { name: "Teal 500", hex: "#14b8a6" },
  { name: "Cyan 500", hex: "#06b6d4" }, { name: "Sky 500", hex: "#0ea5e9" },
  { name: "Blue 500", hex: "#3b82f6" }, { name: "Indigo 500", hex: "#6366f1" },
  { name: "Violet 500", hex: "#8b5cf6" }, { name: "Purple 500", hex: "#a855f7" },
  { name: "Fuchsia 500", hex: "#d946ef" }, { name: "Pink 500", hex: "#ec4899" },
  { name: "Rose 500", hex: "#f43f5e" }
];

type PaletteTab = "css-named" | "flat-ui" | "semantic" | "tailwind";

export default function ColorPickerTab({ activeColor, onChangeColor }: PickerProps) {
  const [hsl, setHsl] = useState<Hsl>({ h: 220, s: 100, l: 50 });
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [alpha, setAlpha] = useState(1);
  const [copied, setCopied] = useState("");
  const [activeTab, setActiveTab] = useState<"picker" | "palettes">("picker");
  const [paletteTab, setPaletteTab] = useState<PaletteTab>("css-named");
  const [hexInput, setHexInput] = useState("");
  const [query, setQuery] = useState("");
  const svRef = useRef<SVGSVGElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"sv" | "hue" | null>(null);

  // Sync active color from parent to HSL state
  useEffect(() => {
    try {
      const parentHsl = hexToHsl(activeColor);
      setHsl(parentHsl);
    } catch {
      // Ignore invalid colors
    }
  }, [activeColor]);

  const hex = hslToHex(hsl);
  const { h, s, l } = hsl;
  const textClr = getLuminance(parseHex(hex)) > 0.55 ? "#081018" : "#f8fafc";
  const formatted = formatColor(hex, format, alpha);

  const hsv = useMemo(() => hslToHsv(hsl), [hsl]);

  const parsedRgb = useMemo(() => {
    try { return parseHex(hex); } catch { return { r: 0, g: 0, b: 0 }; }
  }, [hex]);

  const rgbStr = `rgb(${parsedRgb.r}, ${parsedRgb.g}, ${parsedRgb.b})`;
  const hslStr = `hsl(${h}, ${s}%, ${l}%)`;

  const filteredNamedGroups = useMemo(() => {
    if (!query.trim()) return CSS_NAMED_GROUPS;
    const q = query.toLowerCase().trim();
    return CSS_NAMED_GROUPS.map((group) => ({
      ...group,
      colors: group.colors.filter((c) => c.name.toLowerCase().includes(q) || c.hex.includes(q))
    })).filter((group) => group.colors.length > 0);
  }, [query]);

  const filteredNamedCount = useMemo(() => {
    return filteredNamedGroups.reduce((sum, g) => sum + g.colors.length, 0);
  }, [filteredNamedGroups]);

  const updateFromSv = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const nextHsv = { h: hsl.h, s: Math.round(x * 100), v: Math.round((1 - y) * 100) };
    const nextHsl = hsvToHsl(nextHsv);
    setHsl(nextHsl);
    setHexInput("");
    onChangeColor(hslToHex(nextHsl));
  }, [hsl.h, onChangeColor]);

  const updateFromHue = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const nextH = Math.round(x * 360);
    setHsl((prev) => {
      const updated = { ...prev, h: nextH };
      onChangeColor(hslToHex(updated));
      return updated;
    });
    setHexInput("");
  }, [onChangeColor]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging === "sv") updateFromSv(e.clientX, e.clientY);
    else if (dragging === "hue") updateFromHue(e.clientX);
  }, [dragging, updateFromSv, updateFromHue]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    if (dragging === "sv") updateFromSv(touch.clientX, touch.clientY);
    else if (dragging === "hue") updateFromHue(touch.clientX);
  }, [dragging, updateFromSv, updateFromHue]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleTouchMove, handleMouseUp]);

  function handleHexChange(value: string) {
    setHexInput(value);
    const parsed = value.trim().replace(/^#/, "");
    const n = parsed.length === 3 ? parsed.split("").map((p) => p + p).join("") : parsed;
    if (n.length === 6 && /^[0-9a-fA-F]{6}$/.test(n)) {
      const nextHex = "#" + n;
      const nextHsl = hexToHsl(nextHex);
      setHsl(nextHsl);
      onChangeColor(nextHex);
    }
  }

  async function copyColor(val: string, label: string) {
    await navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function handleSelectPresetColor(presetHex: string) {
    const nextHsl = hexToHsl(presetHex);
    setHsl(nextHsl);
    onChangeColor(presetHex);
  }

  function renderSwatch(color: PaletteColor) {
    const val = formatColor(color.hex, format);
    const isCopied = copied === color.name;

    return (
      <div
        key={color.hex + color.name}
        className="color-picker-card"
        onClick={() => {
          handleSelectPresetColor(color.hex);
          void copyColor(val, color.name);
        }}
        style={{ cursor: "pointer" }}
      >
        <div className="color-picker-swatch-preview" style={{ background: color.hex, height: "80px", borderRadius: "var(--radius-md) var(--radius-md) 0 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{
            background: isCopied ? "rgba(0,0,0,0.8)" : "transparent",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.75rem",
            fontWeight: 600,
            opacity: isCopied ? 1 : 0,
            transition: "opacity 0.2s var(--ease-out)",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            已复制
          </span>
        </div>
        <div className="color-picker-swatch-info" style={{ padding: "8px" }}>
          <span className="color-picker-swatch-name" style={{ fontWeight: 600, fontSize: "0.85rem", display: "block" }}>{color.name}</span>
          <span className="color-picker-swatch-value" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{val}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="segmented-control" style={{ marginBottom: 16 }}>
        <button type="button"
          className={activeTab === "picker" ? "active" : ""}
          onClick={() => setActiveTab("picker")}>取色器</button>
        <button type="button"
          className={activeTab === "palettes" ? "active" : ""}
          onClick={() => setActiveTab("palettes")}>色板库</button>
      </div>

      {activeTab === "picker" && (
        <>
          <div className="picker-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div className="picker-canvas-area" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="picker-sv-container"
                style={{ position: "relative", width: "100%", height: "260px", borderRadius: "var(--radius-lg)", overflow: "hidden" }}
                onTouchStart={(e) => { setDragging("sv"); updateFromSv(e.touches[0].clientX, e.touches[0].clientY); }}>
                <svg ref={svRef} className="picker-sv-canvas" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}
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
                  <g transform={`translate(${hsv.s}, ${100 - hsv.v})`}>
                    <circle cx="0" cy="0" r="5.5" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="5.5" fill="none" stroke="white" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="1.5" fill="white" />
                  </g>
                </svg>
              </div>
              <div ref={hueRef} className="picker-hue-slider"
                style={{ position: "relative", height: "16px", borderRadius: "8px", cursor: "pointer", background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
                onMouseDown={(e) => { setDragging("hue"); updateFromHue(e.clientX); }}
                onTouchStart={(e) => { setDragging("hue"); updateFromHue(e.touches[0].clientX); }}>
                <div className="picker-hue-thumb" style={{ position: "absolute", width: "18px", height: "18px", borderRadius: "50%", border: "2px solid white", top: "-1px", transform: "translateX(-9px)", boxShadow: "0 2px 4px rgba(0,0,0,0.3)", left: `${(h / 360) * 100}%`, background: `hsl(${h}, 100%, 50%)` }} />
              </div>
            </div>
            <div className="picker-controls" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="picker-preview" style={{ height: "110px", borderRadius: "var(--radius-lg)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="picker-preview-overlay" style={{ backgroundColor: formatted, position: "absolute", inset: 0, zIndex: 1 }} />
                <div className="picker-preview-content" style={{ zIndex: 2, display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{
                    background: textClr === "#081018" ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.7)",
                    color: textClr,
                    padding: "8px 14px",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    backdropFilter: "blur(8px)",
                  }}>
                    {formatted}
                  </div>
                  <button type="button" className="button--primary" onClick={() => void copyColor(formatted, "picker")} style={{ margin: 0 }}>
                    {copied === "picker" ? "已复制" : "复制"}
                  </button>
                </div>
              </div>
              <div className="picker-sliders" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label className="tool-field tool-field--compact">
                  <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>色相 (Hue)</span>
                    <span style={{ fontFamily: "monospace", opacity: 0.85 }}>{h}°</span>
                  </span>
                  <input type="range" min={0} max={360} value={h} onChange={(e) => {
                    const nextH = Number(e.target.value);
                    setHsl((p) => {
                      const updated = { ...p, h: nextH };
                      onChangeColor(hslToHex(updated));
                      return updated;
                    });
                    setHexInput("");
                  }} />
                </label>
                <label className="tool-field tool-field--compact">
                  <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>饱和度 (Saturation)</span>
                    <span style={{ fontFamily: "monospace", opacity: 0.85 }}>{s}%</span>
                  </span>
                  <input type="range" min={0} max={100} value={s} onChange={(e) => {
                    const nextS = Number(e.target.value);
                    setHsl((p) => {
                      const updated = { ...p, s: nextS };
                      onChangeColor(hslToHex(updated));
                      return updated;
                    });
                    setHexInput("");
                  }} />
                </label>
                <label className="tool-field tool-field--compact">
                  <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>亮度 (Lightness)</span>
                    <span style={{ fontFamily: "monospace", opacity: 0.85 }}>{l}%</span>
                  </span>
                  <input type="range" min={0} max={100} value={l} onChange={(e) => {
                    const nextL = Number(e.target.value);
                    setHsl((p) => {
                      const updated = { ...p, l: nextL };
                      onChangeColor(hslToHex(updated));
                      return updated;
                    });
                    setHexInput("");
                  }} />
                </label>
                {(format === "rgba" || format === "hsla") && (
                  <label className="tool-field tool-field--compact">
                    <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span>不透明度 (Alpha)</span>
                      <span style={{ fontFamily: "monospace", opacity: 0.85 }}>{Math.round(alpha * 100)}%</span>
                    </span>
                    <input type="range" min={0} max={1} step={0.01} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} />
                  </label>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="tool-field">
                  <span>HEX 格式输入/编辑</span>
                  <input value={hexInput || hex} onChange={(e) => handleHexChange(e.target.value)} spellCheck={false} placeholder="#000000" />
                </label>
                <label className="tool-field">
                  <span>选择格式</span>
                  <select value={format} onChange={(e) => setFormat(e.target.value as ColorFormat)} style={{ width: "100%" }}>
                    <option value="hex">HEX</option>
                    <option value="rgb">RGB</option>
                    <option value="hsl">HSL</option>
                    <option value="rgba">RGBA</option>
                    <option value="hsla">HSLA</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "palettes" && (
        <>
          <div className="segmented-control" style={{ marginBottom: 16 }}>
            {(["css-named", "flat-ui", "semantic", "tailwind"] as PaletteTab[]).map((tab) => (
              <button key={tab} type="button"
                className={paletteTab === tab ? "active" : ""}
                onClick={() => setPaletteTab(tab)}>
                {tab === "css-named" ? "CSS 命名色" : tab === "flat-ui" ? "Flat UI" : tab === "semantic" ? "语义色" : "Tailwind"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: paletteTab === "css-named" ? "1fr 1fr" : "1fr", gap: "1rem" }}>
              <label className="tool-field">
                <span>复制格式</span>
                <select value={format} onChange={(e) => setFormat(e.target.value as ColorFormat)}>
                  <option value="hex">HEX</option>
                  <option value="rgb">RGB</option>
                  <option value="hsl">HSL</option>
                  <option value="rgba">RGBA</option>
                  <option value="hsla">HSLA</option>
                </select>
              </label>
              {paletteTab === "css-named" && (
                <label className="tool-field">
                  <span>搜索颜色</span>
                  <input value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="输入颜色名称或 HEX 值…" spellCheck={false} />
                </label>
              )}
            </div>
          </div>

          {paletteTab === "css-named" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {filteredNamedGroups.map((group) => (
                <div key={group.label}>
                  <p className="eyebrow" style={{ marginBottom: 12 }}>{group.label}</p>
                  <div className="color-picker-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1rem" }}>
                    {group.colors.map(renderSwatch)}
                  </div>
                </div>
              ))}
              {query && filteredNamedCount === 0 ? <p className="tool-error">未找到匹配的颜色</p> : null}
            </div>
          )}

          {paletteTab === "flat-ui" && (
            <div>
              <p className="tool-note" style={{ marginBottom: 12 }}>Flat UI 经典配色</p>
              <div className="color-picker-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1rem" }}>
                {FLAT_UI_COLORS.map(renderSwatch)}
              </div>
            </div>
          )}

          {paletteTab === "semantic" && (
            <div>
              <p className="tool-note" style={{ marginBottom: 12 }}>UI 语义色 — 常用于状态指示</p>
              <div className="color-picker-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1rem" }}>
                {SEMANTIC_COLORS.map(renderSwatch)}
              </div>
            </div>
          )}

          {paletteTab === "tailwind" && (
            <div>
              <p className="tool-note" style={{ marginBottom: 12 }}>Tailwind CSS 常用色板</p>
              <div className="color-picker-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1rem" }}>
                {TAILWIND_COLORS.map(renderSwatch)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
