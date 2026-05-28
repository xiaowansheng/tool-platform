"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Preset {
  name: string;
  value: [number, number, number, number];
}

const presets: Preset[] = [
  { name: "Standard", value: [0.2, 0, 0, 1] },
  { name: "Ease Out", value: [0.16, 1, 0.3, 1] },
  { name: "Ease In Out", value: [0.65, 0, 0.35, 1] },
  { name: "Overshoot", value: [0.34, 1.56, 0.64, 1] },
  { name: "Sharp", value: [0.4, 0, 0.6, 1] }
];

function cubicPoint(t: number, p1: number, p2: number) {
  const inverse = 1 - t;

  return 3 * inverse * inverse * t * p1 + 3 * inverse * t * t * p2 + t * t * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function format(value: number) {
  return Number(value.toFixed(3)).toString();
}

export default function EasingCubicBezierDebuggerTool({ manifest }: ToolClientProps) {
  const [x1, setX1] = useState(0.16);
  const [y1, setY1] = useState(1);
  const [x2, setX2] = useState(0.3);
  const [y2, setY2] = useState(1);
  const [duration, setDuration] = useState(420);
  const [runKey, setRunKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const easing = `cubic-bezier(${format(x1)}, ${format(y1)}, ${format(x2)}, ${format(y2)})`;
  const css = `--ease-custom: ${easing};\ntransition-timing-function: var(--ease-custom);\ntransition-duration: ${duration}ms;`;

  const points = useMemo(() => {
    return Array.from({ length: 28 }, (_, index) => {
      const t = index / 27;
      const x = cubicPoint(t, x1, x2);
      const y = cubicPoint(t, y1, y2);

      return `${clamp(x, 0, 1) * 100},${100 - clamp(y, -0.35, 1.35) * 58 - 21}`;
    }).join(" ");
  }, [x1, x2, y1, y2]);

  async function copyCss() {
    await navigator.clipboard.writeText(css);
    setCopied(true);
  }

  function applyPreset(preset: Preset) {
    const [nextX1, nextY1, nextX2, nextY2] = preset.value;
    setX1(nextX1);
    setY1(nextY1);
    setX2(nextX2);
    setY2(nextY2);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Motion Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-option-list">
        {presets.map((preset) => (
          <button key={preset.name} type="button" onClick={() => applyPreset(preset)}>{preset.name}</button>
        ))}
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>X1</span>
          <input type="number" min="0" max="1" step="0.01" value={x1} onChange={(event) => setX1(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Y1</span>
          <input type="number" min="-2" max="2" step="0.01" value={y1} onChange={(event) => setY1(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>X2</span>
          <input type="number" min="0" max="1" step="0.01" value={x2} onChange={(event) => setX2(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Y2</span>
          <input type="number" min="-2" max="2" step="0.01" value={y2} onChange={(event) => setY2(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Duration ms</span>
          <input type="number" min="80" max="3000" step="20" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => setRunKey((value) => value + 1)}>Replay</button>
      </div>

      <div className="asset-preview-grid">
        <article className="detail-card easing-plot">
          <svg viewBox="0 0 100 100" role="img" aria-label="Cubic bezier curve">
            <line x1="0" y1="79" x2="100" y2="21" />
            <polyline points={points} />
            <circle cx={x1 * 100} cy={100 - clamp(y1, -0.35, 1.35) * 58 - 21} r="3" />
            <circle cx={x2 * 100} cy={100 - clamp(y2, -0.35, 1.35) * 58 - 21} r="3" />
          </svg>
          <p className="mono-output">{easing}</p>
        </article>
        <article className="detail-card easing-runner">
          <div
            key={runKey}
            className="easing-runner__dot"
            style={{ animationDuration: `${duration}ms`, animationTimingFunction: easing }}
          />
          <p>Replay uses the current cubic-bezier and duration.</p>
        </article>
      </div>

      <label className="tool-field">
        <span>CSS token</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>

      <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
    </section>
  );
}
