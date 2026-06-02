"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function TransformGeneratorTool({ manifest }: ToolAppProps) {
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [rotate, setRotate] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [skewX, setSkewX] = useState(0);
  const [skewY, setSkewY] = useState(0);
  const [bgColor, setBgColor] = useState("#8b5cf6");
  const [copied, setCopied] = useState(false);

  const transforms: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    transforms.push(`translate(${translateX}px, ${translateY}px)`);
  }
  if (rotate !== 0) {
    transforms.push(`rotate(${rotate}deg)`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }
  if (skewX !== 0) {
    transforms.push(`skewX(${skewX}deg)`);
  }
  if (skewY !== 0) {
    transforms.push(`skewY(${skewY}deg)`);
  }

  const transformValue = transforms.join(" ") || "none";

  const previewStyle: CSSProperties = {
    width: 120,
    height: 120,
    background: bgColor,
    borderRadius: 16,
    transform: transformValue,
    transition: "transform 0.25s ease",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.85rem"
  };

  const css = `.transformed-box {
  transform: ${transformValue};
}`;

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function reset() {
    setTranslateX(0);
    setTranslateY(0);
    setRotate(0);
    setScaleX(1);
    setScaleY(1);
    setSkewX(0);
    setSkewY(0);
  }

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
          <span>平移 X px</span>
          <input type="number" value={translateX} onChange={(event) => setTranslateX(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>平移 Y px</span>
          <input type="number" value={translateY} onChange={(event) => setTranslateY(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>旋转 deg</span>
          <input type="number" value={rotate} onChange={(event) => setRotate(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>缩放 X</span>
          <input type="number" min="0" max="5" step="0.1" value={scaleX} onChange={(event) => setScaleX(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>缩放 Y</span>
          <input type="number" min="0" max="5" step="0.1" value={scaleY} onChange={(event) => setScaleY(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>倾斜 X deg</span>
          <input type="number" value={skewX} onChange={(event) => setSkewX(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>倾斜 Y deg</span>
          <input type="number" value={skewY} onChange={(event) => setSkewY(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色</span>
          <input type="color" value={bgColor} onChange={(event) => setBgColor(event.target.value)} />
        </label>
        <button type="button" onClick={reset}>重置</button>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="visual-preview">
        <div style={previewStyle}>transform</div>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>transform</h3><p className="mono-output" style={{ fontSize: "0.82rem", border: "none", padding: 0 }}>{transformValue}</p></article>
      </div>

      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
