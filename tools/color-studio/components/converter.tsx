"use client";

import { useState, useEffect } from "react";
import { parseHex, toHex, toHsl, getLuminance, type Rgb } from "../utils/color";

interface ConverterProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

export default function ColorConverterTab({ activeColor, onChangeColor }: ConverterProps) {
  const [hex, setHex] = useState(activeColor);
  const [copied, setCopied] = useState("");
  let error = "";
  let rgb: Rgb = { r: 94, g: 234, b: 212 };

  useEffect(() => {
    setHex(activeColor);
  }, [activeColor]);

  try {
    rgb = parseHex(hex);
  } catch (parseError) {
    error = parseError instanceof Error ? parseError.message : "颜色转换失败";
  }

  const normalizedHex = error ? "" : toHex(rgb);
  const hsl = toHsl(rgb);
  const rgbValue = error ? "" : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslValue = error ? "" : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const previewTextColor = getLuminance(rgb) > 0.58 ? "#081018" : "#f8fafc";

  const handleHexChange = (val: string) => {
    setHex(val);
    setCopied("");
    try {
      const parsed = parseHex(val);
      onChangeColor(toHex(parsed));
    } catch {
      // Allow user to keep typing invalid state
    }
  };

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
        <button type="button" onClick={() => void copyValue("hex", normalizedHex)} disabled={Boolean(error)}>
          {copied === "hex" ? "已复制 HEX" : "复制 HEX"}
        </button>
        <button type="button" onClick={() => void copyValue("rgb", rgbValue)} disabled={Boolean(error)}>
          {copied === "rgb" ? "已复制 RGB" : "复制 RGB"}
        </button>
        <button type="button" onClick={() => void copyValue("hsl", hslValue)} disabled={Boolean(error)}>
          {copied === "hsl" ? "已复制 HSL" : "复制 HSL"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card" style={{ background: normalizedHex || "var(--bg-inset)", color: previewTextColor, transition: "background 0.2s ease" }}>
          <h3 style={{ color: previewTextColor }}>预览</h3>
          <p style={{ color: previewTextColor }}>{normalizedHex || "待修正"}</p>
        </article>
        <article className="detail-card">
          <h3>RGB</h3>
          <p>{rgbValue || "待修正"}</p>
        </article>
        <article className="detail-card">
          <h3>HSL</h3>
          <p>{hslValue || "待修正"}</p>
        </article>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">当前工具接受 3 位或 6 位 HEX；如果要处理透明度，可先把 alpha 单独记录为 opacity 或 rgba 的第四个值。</p>
    </div>
  );
}
