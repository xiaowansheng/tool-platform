"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type CssUnit = "px" | "rem";

function round(value: number) {
  return Number(value.toFixed(4));
}

function buildClamp(minSize: number, maxSize: number, minViewport: number, maxViewport: number, unit: CssUnit) {
  if (maxViewport <= minViewport) {
    throw new Error("最大视口必须大于最小视口");
  }

  if (maxSize < minSize) {
    throw new Error("最大尺寸必须大于或等于最小尺寸");
  }

  const slope = ((maxSize - minSize) / (maxViewport - minViewport)) * 100;
  const intercept = minSize - (slope / 100) * minViewport;
  const preferred = `${round(intercept)}${unit} + ${round(slope)}vw`;

  return `clamp(${round(minSize)}${unit}, ${preferred}, ${round(maxSize)}${unit})`;
}

export default function CssClampGeneratorTool({ manifest }: ToolClientProps) {
  const [minSize, setMinSize] = useState(1);
  const [maxSize, setMaxSize] = useState(2.5);
  const [minViewport, setMinViewport] = useState(360);
  const [maxViewport, setMaxViewport] = useState(1440);
  const [unit, setUnit] = useState<CssUnit>("rem");
  const [copied, setCopied] = useState(false);

  let output = "";
  let error = "";

  try {
    output = buildClamp(minSize, maxSize, minViewport, maxViewport, unit);
  } catch (buildError) {
    error = buildError instanceof Error ? buildError.message : "clamp 生成失败";
  }

  async function handleCopy() {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Design Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>最小尺寸</span>
          <input type="number" step="0.1" value={minSize} onChange={(event) => setMinSize(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大尺寸</span>
          <input type="number" step="0.1" value={maxSize} onChange={(event) => setMaxSize(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最小视口 px</span>
          <input type="number" value={minViewport} onChange={(event) => setMinViewport(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大视口 px</span>
          <input type="number" value={maxViewport} onChange={(event) => setMaxViewport(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>单位</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as CssUnit)}>
            <option value="rem">rem</option>
            <option value="px">px</option>
          </select>
        </label>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <label className="tool-field">
        <span>CSS</span>
        <textarea value={output ? `font-size: ${output};` : ""} readOnly spellCheck={false} />
      </label>
      <article className="detail-card clamp-preview">
        <p className="eyebrow">Preview</p>
        <strong style={output ? { fontSize: output } : undefined}>Fluid typography preview</strong>
        <p>拖动浏览器宽度可观察 clamp() 在最小和最大尺寸之间平滑变化。</p>
      </article>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
