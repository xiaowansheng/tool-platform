"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type GradientType = "linear" | "radial" | "conic";

interface ColorStop {
  color: string;
  position: number;
}

export default function CssGradientGenerator({ manifest }: ToolAppProps) {
  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [radialShape, setRadialShape] = useState<"circle" | "ellipse">("circle");
  const [stops, setStops] = useState<ColorStop[]>([
    { color: "#667eea", position: 0 },
    { color: "#764ba2", position: 100 }
  ]);
  const [copied, setCopied] = useState(false);

  function updateStop(index: number, key: keyof ColorStop, value: string | number) {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
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
    navigator.clipboard.writeText(fullCss).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">CSS 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>类型</span>
          <select value={type} onChange={(e) => setType(e.target.value as GradientType)}>
            <option value="linear">线性 (Linear)</option>
            <option value="radial">径向 (Radial)</option>
            <option value="conic">锥形 (Conic)</option>
          </select>
        </label>
        {(type === "linear" || type === "conic") && (
          <label className="tool-field tool-field--compact">
            <span>角度 ({angle}°)</span>
            <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
          </label>
        )}
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

      {/* Preview */}
      <div
        style={{
          background: cssCode,
          width: "100%",
          height: 180,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)"
        }}
      />

      {/* Color stops */}
      <div style={{ marginTop: 16 }}>
        {stops.map((stop, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input
              type="color"
              value={stop.color}
              onChange={(e) => updateStop(i, "color", e.target.value)}
              style={{ width: 36, height: 36, border: "none", cursor: "pointer" }}
            />
            <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
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
              onClick={() => removeStop(i)}
              disabled={stops.length <= 2}
              style={{ padding: "4px 8px", opacity: stops.length <= 2 ? 0.3 : 1 }}
            >
              ✕
            </button>
          </div>
        ))}
        <button onClick={addStop} style={{ marginTop: 4 }}>
          + 添加色标
        </button>
      </div>

      {/* CSS Output */}
      <div className="detail-grid" style={{ marginTop: 16 }}>
        <article className="detail-card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>CSS 代码</h3>
            <button onClick={copyCode}>{copied ? "已复制!" : "复制"}</button>
          </div>
          <code style={{ fontSize: 13, wordBreak: "break-all", display: "block", marginTop: 8 }}>
            {fullCss}
          </code>
        </article>
      </div>
    </section>
  );
}
