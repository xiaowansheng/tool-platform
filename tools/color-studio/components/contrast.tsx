"use client";

import { useMemo, useState, useEffect } from "react";
import { parseHex, toHex, contrastRatio, normalizeHexInput } from "../utils/color";

interface ContrastProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span className={`status-label ${pass ? "status-label--on" : "status-label--off"}`}>
      {pass ? "通过" : "未通过"}
    </span>
  );
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

  const ratioFill = Math.min(result.ratio / 21, 1) * 100;

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

      {/* Contrast ratio gauge */}
      <div style={{ margin: "0 0 20px 0", padding: "16px", background: "var(--bg-subtle)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--accent-primary)", fontFamily: "monospace" }}>{result.ratioText}</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>对比度</span>
        </div>
        <div style={{ position: "relative", height: "8px", background: "var(--bg-muted)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${ratioFill}%`, background: "var(--accent-primary)", borderRadius: "4px", transition: "width 0.3s ease" }} />
        </div>
        <div style={{ display: "flex", position: "relative", marginTop: "4px" }}>
          <span style={{ position: "absolute", left: `${(3 / 21) * 100}%`, transform: "translateX(-50%)", fontSize: "0.65rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>3:1</span>
          <span style={{ position: "absolute", left: `${(4.5 / 21) * 100}%`, transform: "translateX(-50%)", fontSize: "0.65rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>4.5:1</span>
          <span style={{ position: "absolute", left: `${(7 / 21) * 100}%`, transform: "translateX(-50%)", fontSize: "0.65rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>7:1</span>
        </div>
      </div>

      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
        <article className="detail-card">
          <h3>AA 正文</h3>
          <PassBadge pass={result.aaNormal} />
        </article>
        <article className="detail-card">
          <h3>AAA 正文</h3>
          <PassBadge pass={result.aaaNormal} />
        </article>
        <article className="detail-card">
          <h3>AA 大字号</h3>
          <PassBadge pass={result.aaLarge} />
        </article>
        <article className="detail-card">
          <h3>AAA 大字号</h3>
          <PassBadge pass={result.aaaLarge} />
        </article>
        <article className="detail-card">
          <h3>UI 图形</h3>
          <PassBadge pass={result.ui} />
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
