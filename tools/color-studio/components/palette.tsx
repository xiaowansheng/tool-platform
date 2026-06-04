"use client";

import { useState, useEffect, useMemo } from "react";
import { parseHex, toHex, swatchTextColor, buildScale } from "../utils/color";

interface PaletteProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

export default function ColorPaletteTab({ activeColor, onChangeColor }: PaletteProps) {
  const [hex, setHex] = useState(activeColor);
  const [copied, setCopied] = useState("");
  const [cssPrefix, setCssPrefix] = useState("color");
  const [cssCopied, setCssCopied] = useState(false);

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  const palette = useMemo(() => {
    try {
      return { items: buildScale(hex).map(([label, color]) => ({ label, color })), error: "" };
    } catch (e) {
      return { items: [] as Array<{ label: string; color: string }>, error: e instanceof Error ? e.message : "颜色生成失败" };
    }
  }, [hex]);

  const cssVars = useMemo(() => {
    if (palette.error) return "";
    return `:root {\n${palette.items.map(({ label, color }) => `  --${cssPrefix}-${label}: ${color};`).join("\n")}\n}`;
  }, [palette, cssPrefix]);

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

  async function copyCssVars() {
    try {
      await navigator.clipboard.writeText(cssVars);
      setCssCopied(true);
    } catch {
      setCssCopied(false);
    } finally {
      setTimeout(() => setCssCopied(false), 2000);
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
          <input type="color" value={palette.error ? "#000000" : hex} onChange={(event) => handleHexChange(event.target.value)} />
        </label>
      </div>
      <div className="palette-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem", margin: "20px 0" }}>
        {palette.items.map((item) => {
          const isBase = item.label === "500";
          const textClr = swatchTextColor(parseHex(item.color));
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

      {/* CSS Variables export */}
      {!palette.error && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "end", marginBottom: "12px" }}>
            <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
              <span>CSS 变量前缀</span>
              <input value={cssPrefix} onChange={(e) => setCssPrefix(e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())} placeholder="color" />
            </label>
            <button type="button" className="button--primary" onClick={() => void copyCssVars()} style={{ flexShrink: 0 }}>
              {cssCopied ? "已复制" : "复制 CSS 变量"}
            </button>
          </div>
          <label className="tool-field">
            <span>CSS 变量代码</span>
            <textarea value={cssVars} readOnly spellCheck={false} />
          </label>
        </div>
      )}

      {palette.error ? <p className="tool-error">{palette.error}</p> : null}
      <p className="tool-note">输入基础颜色，自动生成从 50 到 900 的完整色阶。点击色块即可将其设为当前基础色并复制其 HEX 值。</p>
    </div>
  );
}
