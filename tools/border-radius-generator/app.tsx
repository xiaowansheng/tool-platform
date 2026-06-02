"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function BorderRadiusGeneratorTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<"uniform" | "per-corner">("uniform");
  const [uniform, setUniform] = useState(16);
  const [tl, setTl] = useState(16);
  const [tr, setTr] = useState(16);
  const [br, setBr] = useState(16);
  const [bl, setBl] = useState(16);
  const [width, setWidth] = useState(240);
  const [height, setHeight] = useState(160);
  const [bgColor, setBgColor] = useState("#0ea5e9");
  const [copied, setCopied] = useState(false);

  const borderRadius = mode === "uniform"
    ? `${uniform}px`
    : `${tl}px ${tr}px ${br}px ${bl}px`;

  const css = `.radius-box {
  width: ${width}px;
  height: ${height}px;
  background: ${bgColor};
  border-radius: ${borderRadius};
}`;

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
          <span>模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as "uniform" | "per-corner")}>
            <option value="uniform">统一圆角</option>
            <option value="per-corner">各角独立</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>圆角 px</span>
          <input
            type="number" min="0" max="999"
            value={uniform}
            onChange={(event) => setUniform(Math.max(0, Number(event.target.value)))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>宽度 px</span>
          <input
            type="number" min="40" max="600"
            value={width}
            onChange={(event) => setWidth(Math.max(40, Math.min(600, Number(event.target.value))))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>高度 px</span>
          <input
            type="number" min="40" max="600"
            value={height}
            onChange={(event) => setHeight(Math.max(40, Math.min(600, Number(event.target.value))))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色</span>
          <input value={bgColor} onChange={(event) => setBgColor(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>取色</span>
          <input type="color" value={bgColor} onChange={(event) => setBgColor(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      {mode === "per-corner" ? (
        <div className="tool-toolbar tool-toolbar--grid">
          <label className="tool-field tool-field--compact">
            <span>左上角 px</span>
            <input type="number" min="0" max="999" value={tl} onChange={(event) => setTl(Math.max(0, Number(event.target.value)))} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>右上角 px</span>
            <input type="number" min="0" max="999" value={tr} onChange={(event) => setTr(Math.max(0, Number(event.target.value)))} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>右下角 px</span>
            <input type="number" min="0" max="999" value={br} onChange={(event) => setBr(Math.max(0, Number(event.target.value)))} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>左下角 px</span>
            <input type="number" min="0" max="999" value={bl} onChange={(event) => setBl(Math.max(0, Number(event.target.value)))} />
          </label>
        </div>
      ) : null}

      <div className="visual-preview">
        <div
          style={{
            width: `${Math.min(width, 480)}px`,
            height: `${Math.min(height, 360)}px`,
            background: bgColor,
            borderRadius,
            transition: "border-radius 0.2s, width 0.2s, height 0.2s"
          }}
        />
      </div>

      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
