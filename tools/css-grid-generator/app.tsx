"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type GridMode = "fixed" | "auto-fit";

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function repeatCells(count: number) {
  return Array.from({ length: Math.max(1, Math.min(count, 40)) }, (_, index) => index + 1);
}

export default function CssGridGeneratorTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<GridMode>("fixed");
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);
  const [gap, setGap] = useState(16);
  const [minColumnWidth, setMinColumnWidth] = useState(180);
  const [rowHeight, setRowHeight] = useState(88);
  const [copied, setCopied] = useState(false);

  const gridTemplateColumns = mode === "fixed"
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`;
  const gridTemplateRows = `repeat(${rows}, ${rowHeight}px)`;
  const previewStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns,
    gridTemplateRows,
    gap: `${gap}px`
  };
  const css = [
    ".grid-layout {",
    "  display: grid;",
    `  grid-template-columns: ${gridTemplateColumns};`,
    mode === "fixed" ? `  grid-template-rows: ${gridTemplateRows};` : "  grid-auto-rows: minmax(88px, auto);",
    `  gap: ${gap}px;`,
    "}"
  ].join("\n");
  const cellCount = mode === "fixed" ? columns * rows : Math.max(columns * rows, 12);

  async function copyCss() {
    await navigator.clipboard.writeText(css);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">布局工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as GridMode)}>
            <option value="fixed">固定列数</option>
            <option value="auto-fit">Auto-fit 自适应</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>列数</span>
          <input
            min="1"
            max="8"
            type="number"
            value={columns}
            onChange={(event) => setColumns(Math.max(1, Math.min(8, toNumber(event.target.value, columns))))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>行数</span>
          <input
            min="1"
            max="8"
            type="number"
            value={rows}
            onChange={(event) => setRows(Math.max(1, Math.min(8, toNumber(event.target.value, rows))))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>间距 px</span>
          <input
            min="0"
            max="64"
            type="number"
            value={gap}
            onChange={(event) => setGap(Math.max(0, toNumber(event.target.value, gap)))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最小列宽 px</span>
          <input
            min="80"
            max="420"
            type="number"
            value={minColumnWidth}
            onChange={(event) => setMinColumnWidth(Math.max(80, toNumber(event.target.value, minColumnWidth)))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>行高 px</span>
          <input
            min="40"
            max="220"
            type="number"
            value={rowHeight}
            onChange={(event) => setRowHeight(Math.max(40, toNumber(event.target.value, rowHeight)))}
          />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="visual-preview css-layout-preview">
        <div className="css-grid-preview" style={previewStyle}>
          {repeatCells(cellCount).map((cell) => (
            <div key={cell} className="css-layout-cell">{cell}</div>
          ))}
        </div>
      </div>

      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
