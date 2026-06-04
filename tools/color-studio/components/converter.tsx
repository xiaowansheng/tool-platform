"use client";

import { useState, useEffect, useMemo } from "react";
import { parseHex, toHex, toHsl, hslToHex, swatchTextColor, type Rgb, type Hsl } from "../utils/color";

interface ConverterProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

export default function ColorConverterTab({ activeColor, onChangeColor }: ConverterProps) {
  const [hex, setHex] = useState(activeColor);
  const [alpha, setAlpha] = useState(1);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  const parsed = useMemo(() => {
    try {
      const rgb = parseHex(hex);
      const hsl = toHsl(rgb);
      return { rgb, hsl, error: "" };
    } catch (e) {
      return { rgb: { r: 0, g: 0, b: 0 } as Rgb, hsl: { h: 0, s: 0, l: 0 } as Hsl, error: e instanceof Error ? e.message : "颜色转换失败" };
    }
  }, [hex]);

  const { rgb, hsl, error } = parsed;
  const normalizedHex = error ? "" : toHex(rgb);
  const textClr = error ? "#f8fafc" : swatchTextColor(rgb);

  const rgbStr = error ? "" : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = error ? "" : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const rgbaStr = error ? "" : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  const hslaStr = error ? "" : `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`;

  function handleHexChange(val: string) {
    setHex(val);
    setCopied("");
    try {
      const p = parseHex(val);
      onChangeColor(toHex(p));
    } catch {
      // Allow user to keep typing
    }
  }

  function handleRgbChange(channel: "r" | "g" | "b", value: number) {
    const next = { ...parsed.rgb, [channel]: Math.max(0, Math.min(255, value)) };
    const nextHex = toHex(next);
    setHex(nextHex);
    onChangeColor(nextHex);
    setCopied("");
  }

  function handleHslChange(channel: "h" | "s" | "l", value: number) {
    const limits = { h: 360, s: 100, l: 100 };
    const next = { ...parsed.hsl, [channel]: Math.max(0, Math.min(limits[channel], value)) };
    const nextHex = hslToHex(next);
    setHex(nextHex);
    onChangeColor(nextHex);
    setCopied("");
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
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
          <span>HEX 输入</span>
          <input value={hex} onChange={(event) => handleHexChange(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色选择器</span>
          <input type="color" value={normalizedHex || "#000000"} onChange={(event) => handleHexChange(event.target.value)} />
        </label>
      </div>

      {/* Preview */}
      <div style={{ background: normalizedHex || "var(--bg-inset)", color: textClr, padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", margin: "16px 0", transition: "background 0.2s ease", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.05rem" }}>{normalizedHex || "待修正"}</span>
        <button type="button" className="button--primary" onClick={() => void copyValue("hex", normalizedHex)} disabled={Boolean(error)} style={{ margin: 0 }}>
          {copied === "hex" ? "已复制" : "复制 HEX"}
        </button>
      </div>

      {/* RGB editable card */}
      <article className="detail-card" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3>RGB</h3>
          <button type="button" onClick={() => void copyValue("rgb", rgbStr)} disabled={Boolean(error)} style={{ fontSize: "0.8rem" }}>
            {copied === "rgb" ? "已复制" : "复制"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <label className="tool-field tool-field--compact">
            <span>R</span>
            <input type="number" min={0} max={255} value={rgb.r} onChange={(e) => handleRgbChange("r", Number(e.target.value))} disabled={Boolean(error)} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>G</span>
            <input type="number" min={0} max={255} value={rgb.g} onChange={(e) => handleRgbChange("g", Number(e.target.value))} disabled={Boolean(error)} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>B</span>
            <input type="number" min={0} max={255} value={rgb.b} onChange={(e) => handleRgbChange("b", Number(e.target.value))} disabled={Boolean(error)} />
          </label>
        </div>
      </article>

      {/* HSL editable card */}
      <article className="detail-card" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3>HSL</h3>
          <button type="button" onClick={() => void copyValue("hsl", hslStr)} disabled={Boolean(error)} style={{ fontSize: "0.8rem" }}>
            {copied === "hsl" ? "已复制" : "复制"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <label className="tool-field tool-field--compact">
            <span>H (°)</span>
            <input type="number" min={0} max={360} value={hsl.h} onChange={(e) => handleHslChange("h", Number(e.target.value))} disabled={Boolean(error)} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>S (%)</span>
            <input type="number" min={0} max={100} value={hsl.s} onChange={(e) => handleHslChange("s", Number(e.target.value))} disabled={Boolean(error)} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>L (%)</span>
            <input type="number" min={0} max={100} value={hsl.l} onChange={(e) => handleHslChange("l", Number(e.target.value))} disabled={Boolean(error)} />
          </label>
        </div>
      </article>

      {/* Alpha + RGBA / HSLA */}
      <article className="detail-card" style={{ marginBottom: "12px" }}>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h3 style={{ margin: 0 }}>Alpha (不透明度)</h3>
            <span style={{ fontFamily: "monospace", fontSize: "0.85rem", opacity: 0.85 }}>{alpha}</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>RGBA</span>
              <button type="button" onClick={() => void copyValue("rgba", rgbaStr)} disabled={Boolean(error)} style={{ fontSize: "0.75rem" }}>
                {copied === "rgba" ? "已复制" : "复制"}
              </button>
            </div>
            <code style={{ fontSize: "0.85rem", fontFamily: "monospace", display: "block", marginTop: "4px", wordBreak: "break-all", color: "var(--text-secondary)" }}>{rgbaStr || "—"}</code>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>HSLA</span>
              <button type="button" onClick={() => void copyValue("hsla", hslaStr)} disabled={Boolean(error)} style={{ fontSize: "0.75rem" }}>
                {copied === "hsla" ? "已复制" : "复制"}
              </button>
            </div>
            <code style={{ fontSize: "0.85rem", fontFamily: "monospace", display: "block", marginTop: "4px", wordBreak: "break-all", color: "var(--text-secondary)" }}>{hslaStr || "—"}</code>
          </div>
        </div>
      </article>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">支持 HEX / RGB / HSL 双向实时编辑。拖动 Alpha 滑块可生成 RGBA 和 HSLA 格式。每个数值字段均可直接输入修改。</p>
    </div>
  );
}
