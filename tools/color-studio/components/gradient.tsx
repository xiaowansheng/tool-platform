"use client";

import { useState, useMemo, useEffect } from "react";
import { parseHex, toHex, normalizeHexInput, swatchTextColor, buildScale } from "../utils/color";

interface GradientProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

type GradientType = "linear" | "radial" | "conic";

interface ColorStop {
  color: string;
  position: number;
}

export default function ColorGradientTab({ activeColor, onChangeColor }: GradientProps) {
  const [subTab, setSubTab] = useState<"css-gradient" | "tokens">("css-gradient");

  // State for CSS Gradient
  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [radialShape, setRadialShape] = useState<"circle" | "ellipse">("circle");
  const [stops, setStops] = useState<ColorStop[]>([
    { color: activeColor, position: 0 },
    { color: "#38bdf8", position: 100 }
  ]);
  const [gradientCopied, setGradientCopied] = useState(false);

  // Sync activeColor into the first gradient stop color
  useEffect(() => {
    setStops((prev) => prev.map((stop, i) => (i === 0 ? { ...stop, color: activeColor } : stop)));
  }, [activeColor]);

  function updateStop(index: number, key: keyof ColorStop, value: string | number) {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
    if (index === 0 && key === "color") {
      try {
        const parsed = parseHex(value as string);
        onChangeColor(toHex(parsed));
      } catch {
        // Allow temporary typing
      }
    }
  }

  function addStop() {
    setStops((prev) => [...prev, { color: "#ffffff", position: 50 }]);
  }

  function removeStop(index: number) {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  }

  const cssCode = useMemo(() => {
    const stopsStr = stops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => `${s.color} ${s.position}%`)
      .join(", ");

    if (type === "linear") return `linear-gradient(${angle}deg, ${stopsStr})`;
    if (type === "radial") return `radial-gradient(${radialShape}, ${stopsStr})`;
    return `conic-gradient(from ${angle}deg, ${stopsStr})`;
  }, [type, angle, radialShape, stops]);

  const fullCss = `background: ${cssCode};`;

  function copyCode() {
    void navigator.clipboard.writeText(fullCss).then(() => {
      setGradientCopied(true);
      setTimeout(() => setGradientCopied(false), 2000);
    });
  }

  // State for Tokens
  const [from, setFrom] = useState(activeColor);
  const [to, setTo] = useState("#38bdf8");
  const [accent, setAccent] = useState("#fbbf24");
  const [surface, setSurface] = useState("#0d1824");
  const [text, setText] = useState("#e8eff7");
  const [tokenPrefix, setTokenPrefix] = useState("brand");
  const [tokenCopied, setTokenCopied] = useState(false);

  useEffect(() => {
    setFrom(activeColor);
  }, [activeColor]);

  const tokenResult = useMemo(() => {
    try {
      const primaryScale = buildScale(from);
      const secondaryScale = buildScale(to);
      const accentScale = buildScale(accent);
      const css = [
        ":root {",
        ...primaryScale.map(([step, color]) => `  --color-${tokenPrefix}-primary-${step}: ${color};`),
        ...secondaryScale.map(([step, color]) => `  --color-${tokenPrefix}-secondary-${step}: ${color};`),
        ...accentScale.map(([step, color]) => `  --color-${tokenPrefix}-accent-${step}: ${color};`),
        `  --color-${tokenPrefix}-surface: ${surface};`,
        `  --color-${tokenPrefix}-text: ${text};`,
        `  --gradient-${tokenPrefix}: linear-gradient(135deg, ${from}, ${to});`,
        "}"
      ].join("\n");

      return {
        css,
        error: "",
        swatches: [
          ...primaryScale.map(([step, color]) => ({ label: `P ${step}`, color })),
          ...secondaryScale.map(([step, color]) => ({ label: `S ${step}`, color })),
          ...accentScale.map(([step, color]) => ({ label: `A ${step}`, color }))
        ]
      };
    } catch (error) {
      return {
        css: "",
        error: error instanceof Error ? error.message : "Theme token 生成失败。",
        swatches: [] as Array<{ label: string; color: string }>
      };
    }
  }, [accent, from, surface, text, to, tokenPrefix]);

  const handleFromChange = (val: string) => {
    setFrom(val);
    try {
      const parsed = parseHex(val);
      onChangeColor(toHex(parsed));
    } catch {
      // Allow invalid typing
    }
  };

  async function copyTokens() {
    await navigator.clipboard.writeText(tokenResult.css);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  return (
    <div>
      <div className="segmented-control" style={{ marginBottom: 16 }}>
        <button type="button" className={subTab === "css-gradient" ? "active" : ""} onClick={() => setSubTab("css-gradient")}>渐变设计器</button>
        <button type="button" className={subTab === "tokens" ? "active" : ""} onClick={() => setSubTab("tokens")}>主题 Token 生成器</button>
      </div>

      {subTab === "css-gradient" && (
        <div>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>类型</span>
              <select value={type} onChange={(e) => setType(e.target.value as GradientType)}>
                <option value="linear">线性 (Linear)</option>
                <option value="radial">径向 (Radial)</option>
                <option value="conic">锥形 (Conic)</option>
              </select>
            </label>
            {type === "radial" && (
              <label className="tool-field tool-field--compact">
                <span>形状</span>
                <select value={radialShape} onChange={(e) => setRadialShape(e.target.value as "circle" | "ellipse")}>
                  <option value="circle">圆形</option>
                  <option value="ellipse">椭圆</option>
                </select>
              </label>
            )}
          </div>

          {(type === "linear" || type === "conic") && (
            <label className="tool-field tool-field--compact" style={{ marginBottom: "16px" }}>
              <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>角度</span>
                <span style={{ fontFamily: "monospace", opacity: 0.85 }}>{angle}°</span>
              </span>
              <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
            </label>
          )}

          <div
            style={{
              background: cssCode,
              width: "100%",
              height: 120,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              marginBottom: "20px",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
              flexShrink: 0
            }}
          />

          <div>
            <p className="eyebrow">色标配置</p>
            {stops.map((stop, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <input
                  type="color"
                  value={normalizeHexInput(stop.color)}
                  onChange={(e) => updateStop(i, "color", e.target.value)}
                  style={{ width: 36, height: 36, border: "none", cursor: "pointer", borderRadius: "50%", padding: 0, flexShrink: 0 }}
                />
                <label className="tool-field tool-field--compact" style={{ flex: 1, minWidth: 0 }}>
                  <span>位置 ({stop.position}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(e) => updateStop(i, "position", Number(e.target.value))}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeStop(i)}
                  disabled={stops.length <= 2}
                  style={{ padding: "4px 10px", opacity: stops.length <= 2 ? 0.3 : 1, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addStop} style={{ marginTop: 8 }}>
              + 添加色标
            </button>
          </div>

          <div className="detail-grid" style={{ marginTop: 20 }}>
            <article className="detail-card" style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>CSS 样式代码</h3>
                <button type="button" onClick={copyCode}>{gradientCopied ? "已复制!" : "复制"}</button>
              </div>
              <code style={{ fontSize: 13, wordBreak: "break-all", display: "block", marginTop: 12, fontFamily: "monospace", color: "var(--text-secondary)" }}>
                {fullCss}
              </code>
            </article>
          </div>
        </div>
      )}

      {subTab === "tokens" && (
        <div>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>起始色 (主色)</span>
              <input value={from} onChange={(event) => handleFromChange(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>起始取色</span>
              <input type="color" value={normalizeHexInput(from)} onChange={(event) => handleFromChange(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>结束色 (辅色)</span>
              <input value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>结束取色</span>
              <input type="color" value={normalizeHexInput(to)} onChange={(event) => setTo(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>强调色</span>
              <input value={accent} onChange={(event) => setAccent(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>强调取色</span>
              <input type="color" value={normalizeHexInput(accent)} onChange={(event) => setAccent(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>背景/表面色</span>
              <input value={surface} onChange={(event) => setSurface(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>文字色</span>
              <input value={text} onChange={(event) => setText(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Token 前缀</span>
              <input value={tokenPrefix} onChange={(event) => setTokenPrefix(event.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())} />
            </label>
            <button type="button" onClick={() => void copyTokens()}>{tokenCopied ? "已复制" : "复制 CSS Tokens"}</button>
          </div>

          <div className="theme-preview" style={{ background: `linear-gradient(135deg, ${from}, ${to})`, color: text, padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", margin: "20px 0", overflow: "hidden" }}>
            <strong style={{ fontSize: "1.05rem" }}>主题预览 Theme Preview</strong>
            <p style={{ color: text, margin: "6px 0 0 0", fontSize: "0.85rem" }}>由主色、辅助色、强调色、背景表面色和文本色自动生成的 CSS Custom Properties 色阶。</p>
          </div>

          <div className="palette-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: "0.5rem", marginBottom: "20px" }}>
            {tokenResult.swatches.map((item, idx) => {
              const itemText = swatchTextColor(parseHex(item.color));
              return (
                <div key={idx} style={{ background: item.color, color: itemText, border: "1px solid rgba(0,0,0,0.06)", height: "56px", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => handleFromChange(item.color)}>
                  <span style={{ fontSize: "0.65rem", fontWeight: "bold" }}>{item.label}</span>
                  <span style={{ fontSize: "0.6rem", fontFamily: "monospace" }}>{item.color}</span>
                </div>
              );
            })}
          </div>

          <label className="tool-field">
            <span>CSS 变量代码</span>
            <textarea value={tokenResult.css} readOnly spellCheck={false} />
          </label>
          {tokenResult.error ? <p className="tool-error">{tokenResult.error}</p> : null}
        </div>
      )}
    </div>
  );
}
