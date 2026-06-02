"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
type JustifyContent = "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
type AlignItems = "stretch" | "flex-start" | "center" | "flex-end" | "baseline";

const directions: FlexDirection[] = ["row", "row-reverse", "column", "column-reverse"];
const wraps: FlexWrap[] = ["nowrap", "wrap", "wrap-reverse"];
const justifyOptions: JustifyContent[] = ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"];
const alignOptions: AlignItems[] = ["stretch", "flex-start", "center", "flex-end", "baseline"];

function cells(count: number) {
  return Array.from({ length: Math.max(1, Math.min(count, 16)) }, (_, index) => index + 1);
}

export default function FlexboxGeneratorTool({ manifest }: ToolAppProps) {
  const [direction, setDirection] = useState<FlexDirection>("row");
  const [wrap, setWrap] = useState<FlexWrap>("wrap");
  const [justifyContent, setJustifyContent] = useState<JustifyContent>("space-between");
  const [alignItems, setAlignItems] = useState<AlignItems>("center");
  const [gap, setGap] = useState(16);
  const [itemCount, setItemCount] = useState(6);
  const [basis, setBasis] = useState(112);
  const [copied, setCopied] = useState(false);

  const previewStyle: CSSProperties = {
    display: "flex",
    flexDirection: direction,
    flexWrap: wrap,
    justifyContent,
    alignItems,
    gap: `${gap}px`
  };
  const itemStyle: CSSProperties = {
    flex: `0 1 ${basis}px`
  };
  const css = [
    ".flex-layout {",
    "  display: flex;",
    `  flex-direction: ${direction};`,
    `  flex-wrap: ${wrap};`,
    `  justify-content: ${justifyContent};`,
    `  align-items: ${alignItems};`,
    `  gap: ${gap}px;`,
    "}",
    "",
    ".flex-layout > * {",
    `  flex: 0 1 ${basis}px;`,
    "}"
  ].join("\n");

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
          <span>方向</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value as FlexDirection)}>
            {directions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>换行</span>
          <select value={wrap} onChange={(event) => setWrap(event.target.value as FlexWrap)}>
            {wraps.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>主轴对齐</span>
          <select value={justifyContent} onChange={(event) => setJustifyContent(event.target.value as JustifyContent)}>
            {justifyOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>交叉轴对齐</span>
          <select value={alignItems} onChange={(event) => setAlignItems(event.target.value as AlignItems)}>
            {alignOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>间距 px</span>
          <input type="number" min="0" value={gap} onChange={(event) => setGap(Math.max(0, Number(event.target.value)))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>项目数</span>
          <input type="number" min="1" max="16" value={itemCount} onChange={(event) => setItemCount(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>基础宽度 px</span>
          <input type="number" min="48" value={basis} onChange={(event) => setBasis(Math.max(48, Number(event.target.value)))} />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="visual-preview css-layout-preview">
        <div className="css-flex-preview" style={previewStyle}>
          {cells(itemCount).map((item) => (
            <div key={item} className="css-layout-cell css-flex-preview__item" style={itemStyle}>{item}</div>
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
