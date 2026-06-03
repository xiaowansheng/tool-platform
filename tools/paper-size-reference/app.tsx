"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface PaperSize {
  name: string;
  widthMm: number;
  heightMm: number;
}

const A_SERIES: PaperSize[] = [
  { name: "A0", widthMm: 841, heightMm: 1189 },
  { name: "A1", widthMm: 594, heightMm: 841 },
  { name: "A2", widthMm: 420, heightMm: 594 },
  { name: "A3", widthMm: 297, heightMm: 420 },
  { name: "A4", widthMm: 210, heightMm: 297 },
  { name: "A5", widthMm: 148, heightMm: 210 },
  { name: "A6", widthMm: 105, heightMm: 148 },
  { name: "A7", widthMm: 74, heightMm: 105 },
  { name: "A8", widthMm: 52, heightMm: 74 }
];

const B_SERIES: PaperSize[] = [
  { name: "B0", widthMm: 1000, heightMm: 1414 },
  { name: "B1", widthMm: 707, heightMm: 1000 },
  { name: "B2", widthMm: 500, heightMm: 707 },
  { name: "B3", widthMm: 353, heightMm: 500 },
  { name: "B4", widthMm: 250, heightMm: 353 },
  { name: "B5", widthMm: 176, heightMm: 250 },
  { name: "B6", widthMm: 125, heightMm: 176 }
];

const COMMON_SIZES: PaperSize[] = [
  { name: "Letter (US)", widthMm: 215.9, heightMm: 279.4 },
  { name: "Legal (US)", widthMm: 215.9, heightMm: 355.6 },
  { name: "Tabloid (US)", widthMm: 279.4, heightMm: 431.8 },
  { name: "名片", widthMm: 90, heightMm: 54 },
  { name: "明信片", widthMm: 148, heightMm: 100 },
  { name: "信封 DL", widthMm: 220, heightMm: 110 },
  { name: "信封 C5", widthMm: 229, heightMm: 162 },
  { name: "16K", widthMm: 195, heightMm: 270 },
  { name: "32K", widthMm: 135, heightMm: 195 },
  { name: "大度 16K", widthMm: 210, heightMm: 285 },
  { name: "正度 32K", widthMm: 130, heightMm: 184 }
];

type Series = "A" | "B" | "common";

const seriesMap: Record<Series, { label: string; sizes: PaperSize[] }> = {
  A: { label: "A 系列 (ISO 216)", sizes: A_SERIES },
  B: { label: "B 系列 (ISO 216)", sizes: B_SERIES },
  common: { label: "常用印刷品", sizes: COMMON_SIZES }
};

function mmToInch(mm: number): string {
  return (mm / 25.4).toFixed(2);
}

function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export default function PaperSizeReferenceTool({ manifest }: ToolAppProps) {
  const [series, setSeries] = useState<Series>("A");
  const [dpi, setDpi] = useState(300);
  const [copied, setCopied] = useState<string | null>(null);

  const sizes = seriesMap[series].sizes;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">印刷参考</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>纸张系列</span>
          <select value={series} onChange={(e) => setSeries(e.target.value as Series)}>
            {Object.entries(seriesMap).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>DPI（像素换算）</span>
          <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
            <option value={72}>72 DPI（屏幕）</option>
            <option value={96}>96 DPI（Web）</option>
            <option value={150}>150 DPI（草稿打印）</option>
            <option value={300}>300 DPI（高质量打印）</option>
            <option value={600}>600 DPI（专业印刷）</option>
          </select>
        </label>
      </div>

      <div className="case-grid">
        {sizes.map((size) => {
          const key = `${size.name}-${dpi}`;
          const wInch = mmToInch(size.widthMm);
          const hInch = mmToInch(size.heightMm);
          const wPx = mmToPx(size.widthMm, dpi);
          const hPx = mmToPx(size.heightMm, dpi);
          const detail = `${size.widthMm} × ${size.heightMm} mm  |  ${wInch} × ${hInch} in  |  ${wPx} × ${hPx} px`;

          return (
            <article key={size.name} className="detail-card">
              <div className="tool-card__header">
                <div>
                  <p className="eyebrow">{size.widthMm} × {size.heightMm} mm</p>
                  <h3>{size.name}</h3>
                </div>
                <button type="button" onClick={() => void copy(detail, key)}>
                  {copied === key ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output" style={{ fontSize: "0.8em" }}>
                {wInch} × {hInch} in
              </p>
              <p className="mono-output" style={{ fontSize: "0.8em" }}>
                {wPx} × {hPx} px @ {dpi}dpi
              </p>
            </article>
          );
        })}
      </div>

      <p className="tool-note">
        A/B 系列遵循 ISO 216 标准（长宽比 √2:1）。像素值基于所选 DPI 换算：px = mm ÷ 25.4 × DPI。
      </p>
    </section>
  );
}
