"use client";

import { useMemo, useState, useEffect } from "react";
import { parseHex, toHex, contrastRatio, normalizeHexInput } from "../utils/color";

interface ContrastProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

function passLabel(pass: boolean) {
  return pass ? "通过" : "未通过";
}

export default function ColorContrastTab({ activeColor, onChangeColor }: ContrastProps) {
  const [foreground, setForeground] = useState(activeColor);
  const [background, setBackground] = useState("#0d1824");
  const [sampleSize, setSampleSize] = useState(18);
  const [copied, setCopied] = useState(false);

  // Sync activeColor from parent to foreground
  useEffect(() => {
    setForeground(activeColor);
  }, [activeColor]);

  const result = useMemo(() => {
    try {
      const foregroundRgb = parseHex(foreground);
      const backgroundRgb = parseHex(background);
      const ratio = contrastRatio(foregroundRgb, backgroundRgb);

      return {
        error: "",
        ratio,
        ratioText: `${ratio.toFixed(2)}:1`,
        aaNormal: ratio >= 4.5,
        aaaNormal: ratio >= 7,
        aaLarge: ratio >= 3,
        aaaLarge: ratio >= 4.5,
        ui: ratio >= 3
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "颜色解析失败。",
        ratio: 0,
        ratioText: "0:1",
        aaNormal: false,
        aaaNormal: false,
        aaLarge: false,
        aaaLarge: false,
        ui: false
      };
    }
  }, [background, foreground]);

  const css = `color: ${normalizeHexInput(foreground)};\nbackground-color: ${normalizeHexInput(background)};`;

  const handleForegroundChange = (val: string) => {
    setForeground(val);
    try {
      const parsed = parseHex(val);
      onChangeColor(toHex(parsed));
    } catch {
      // Allow invalid typing
    }
  };

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
    } catch {
      setCopied(false);
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>前景色</span>
          <input value={foreground} onChange={(event) => handleForegroundChange(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>前景色选择</span>
          <input type="color" value={normalizeHexInput(foreground)} onChange={(event) => handleForegroundChange(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景色</span>
          <input value={background} onChange={(event) => setBackground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景色选择</span>
          <input type="color" value={normalizeHexInput(background)} onChange={(event) => setBackground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>示例字号 px</span>
          <input type="number" min="10" max="72" value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="contrast-preview" style={{ color: normalizeHexInput(foreground), backgroundColor: normalizeHexInput(background), padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", margin: "20px 0", transition: "all 0.2s ease" }}>
        <strong style={{ fontSize: sampleSize, display: "block", marginBottom: "8px" }}>可读界面文本 Sample Text</strong>
        <p style={{ margin: 0 }}>对比度 {result.ratioText}。WCAG 大字号通常从 18pt 常规字或 14pt 粗体字开始计算。</p>
      </div>

      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
        <article className="detail-card">
          <h3>对比度</h3>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{result.ratioText}</p>
        </article>
        <article className="detail-card">
          <h3>AA 正文</h3>
          <p>{passLabel(result.aaNormal)}</p>
        </article>
        <article className="detail-card">
          <h3>AAA 正文</h3>
          <p>{passLabel(result.aaaNormal)}</p>
        </article>
        <article className="detail-card">
          <h3>AA 大字号</h3>
          <p>{passLabel(result.aaLarge)}</p>
        </article>
        <article className="detail-card">
          <h3>AAA 大字号</h3>
          <p>{passLabel(result.aaaLarge)}</p>
        </article>
        <article className="detail-card">
          <h3>UI 图形</h3>
          <p>{passLabel(result.ui)}</p>
        </article>
      </div>

      <label className="tool-field" style={{ marginTop: "20px" }}>
        <span>复制样式</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>

      {result.error ? <p className="tool-error">{result.error}</p> : null}
    </div>
  );
}
