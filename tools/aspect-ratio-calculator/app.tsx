"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function gcd(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : gcd(right, left % right);
}

export default function AspectRatioCalculatorTool({ manifest }: ToolAppProps) {
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [targetWidth, setTargetWidth] = useState(1280);
  const divisor = gcd(width, height) || 1;
  const ratio = `${width / divisor}:${height / divisor}`;
  const targetHeight = width > 0 ? Math.round((targetWidth * height) / width) : 0;
  const cssRatio = width > 0 && height > 0 ? `${width} / ${height}` : "invalid";

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>宽度</span>
          <input type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>高度</span>
          <input type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>目标宽度</span>
          <input type="number" value={targetWidth} onChange={(event) => setTargetWidth(Number(event.target.value))} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>比例</h3>
          <p>{ratio}</p>
        </article>
        <article className="detail-card">
          <h3>缩放尺寸</h3>
          <p>{targetWidth} x {targetHeight}</p>
        </article>
        <article className="detail-card">
          <h3>CSS</h3>
          <p>aspect-ratio: {cssRatio};</p>
        </article>
      </div>
    </section>
  );
}
