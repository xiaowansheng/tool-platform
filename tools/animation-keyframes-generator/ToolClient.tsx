"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface KeyframeStop {
  pct: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  opacity: number;
}

function defaultStops(): KeyframeStop[] {
  return [
    { pct: 0, translateX: 0, translateY: 0, rotate: 0, scale: 1, opacity: 1 },
    { pct: 50, translateX: 80, translateY: -40, rotate: 180, scale: 0.8, opacity: 0.6 },
    { pct: 100, translateX: 0, translateY: 0, rotate: 360, scale: 1, opacity: 1 }
  ];
}

function buildKeyframesCss(name: string, stops: KeyframeStop[]) {
  const sorted = [...stops].sort((a, b) => a.pct - b.pct);
  const keyframeLines = sorted.map((stop) => {
    const transforms = [
      `translate(${stop.translateX}px, ${stop.translateY}px)`,
      `rotate(${stop.rotate}deg)`,
      `scale(${stop.scale})`
    ].join(" ");
    return `  ${stop.pct}% {
    transform: ${transforms};
    opacity: ${stop.opacity};
  }`;
  });

  return `@keyframes ${name} {\n${keyframeLines.join("\n")}\n}`;
}

export default function AnimationKeyframesGeneratorTool({ manifest }: ToolClientProps) {
  const [name, setName] = useState("slide-rotate");
  const [stops, setStops] = useState<KeyframeStop[]>(defaultStops);
  const [duration, setDuration] = useState(2);
  const [timing, setTiming] = useState("ease-in-out");
  const [delay, setDelay] = useState(0);
  const [iterations, setIterations] = useState("infinite");
  const [direction, setDirection] = useState("normal");
  const [fillMode, setFillMode] = useState("none");
  const [bgColor, setBgColor] = useState("#f59e0b");
  const [copied, setCopied] = useState(false);
  const [run, setRun] = useState(0);

  const keyframesCss = buildKeyframesCss(name, stops);
  const animationCss = `.animated-box {
  animation-name: ${name};
  animation-duration: ${duration}s;
  animation-timing-function: ${timing};
  animation-delay: ${delay}s;
  animation-iteration-count: ${iterations};
  animation-direction: ${direction};
  animation-fill-mode: ${fillMode};
}`;
  const fullCss = `${keyframesCss}\n\n${animationCss}`;

  const previewStyle: CSSProperties = {
    width: 100,
    height: 100,
    background: bgColor,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.82rem",
    animation: run > 0
      ? `${name} ${duration}s ${timing} ${delay}s ${iterations} ${direction} ${fillMode}`
      : "none"
  };

  function updateStop(index: number, field: keyof KeyframeStop, value: number) {
    setStops((prev) => prev.map((stop, i) => i === index ? { ...stop, [field]: value } : stop));
  }

  function addStop() {
    const maxPct = Math.max(...stops.map((s) => s.pct));
    setStops((prev) => [...prev, { pct: Math.min(100, maxPct + 25), translateX: 0, translateY: 0, rotate: 0, scale: 1, opacity: 1 }]);
  }

  function removeStop(index: number) {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setName("slide-rotate");
    setStops(defaultStops());
    setDuration(2);
    setTiming("ease-in-out");
    setDelay(0);
    setIterations("infinite");
    setDirection("normal");
    setFillMode("none");
    setRun(0);
  }

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(fullCss);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">动效工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>名称</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>时长 s</span>
          <input type="number" min="0.1" max="30" step="0.1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>缓动</span>
          <select value={timing} onChange={(event) => setTiming(event.target.value)}>
            <option value="linear">linear</option>
            <option value="ease">ease</option>
            <option value="ease-in">ease-in</option>
            <option value="ease-out">ease-out</option>
            <option value="ease-in-out">ease-in-out</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>延迟 s</span>
          <input type="number" min="0" max="10" step="0.1" value={delay} onChange={(event) => setDelay(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>次数</span>
          <select value={iterations} onChange={(event) => setIterations(event.target.value)}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="infinite">无限</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>方向</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value)}>
            <option value="normal">normal</option>
            <option value="reverse">reverse</option>
            <option value="alternate">alternate</option>
            <option value="alternate-reverse">alternate-reverse</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>填充模式</span>
          <select value={fillMode} onChange={(event) => setFillMode(event.target.value)}>
            <option value="none">none</option>
            <option value="forwards">forwards</option>
            <option value="backwards">backwards</option>
            <option value="both">both</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色</span>
          <input type="color" value={bgColor} onChange={(event) => setBgColor(event.target.value)} />
        </label>
        <button type="button" onClick={() => setRun((v) => v + 1)}>预览动画</button>
        <button type="button" onClick={reset}>重置</button>
        <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS"}</button>
      </div>

      <div className="visual-preview" style={{ minHeight: "10rem" }}>
        <div style={previewStyle}>
          {name}
        </div>
      </div>

      <div className="tool-panel--info" style={{ marginTop: "0.75rem" }}>
        <p className="tool-field" style={{ fontWeight: 600, margin: "0 0 0.5rem", fontSize: "0.9rem" }}>关键帧</p>
        {stops.map((stop, index) => (
          <div key={index} className="tool-toolbar tool-toolbar--grid" style={{ marginBottom: "0.5rem" }}>
            <label className="tool-field tool-field--compact" style={{ minWidth: "4rem" }}>
              <span>位置 %</span>
              <input type="number" min="0" max="100" value={stop.pct} onChange={(event) => updateStop(index, "pct", Math.max(0, Math.min(100, Number(event.target.value))))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>X px</span>
              <input type="number" value={stop.translateX} onChange={(event) => updateStop(index, "translateX", Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Y px</span>
              <input type="number" value={stop.translateY} onChange={(event) => updateStop(index, "translateY", Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>旋转 deg</span>
              <input type="number" value={stop.rotate} onChange={(event) => updateStop(index, "rotate", Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>缩放</span>
              <input type="number" min="0" max="5" step="0.1" value={stop.scale} onChange={(event) => updateStop(index, "scale", Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>透明度</span>
              <input type="number" min="0" max="1" step="0.05" value={stop.opacity} onChange={(event) => updateStop(index, "opacity", Number(event.target.value))} />
            </label>
            <button type="button" onClick={() => removeStop(index)} disabled={stops.length <= 2}>删除</button>
          </div>
        ))}
        <button type="button" onClick={addStop} style={{ marginTop: "0.25rem" }}>+ 添加关键帧</button>
      </div>

      <label className="tool-field" style={{ marginTop: "0.75rem" }}>
        <span>CSS</span>
        <textarea value={fullCss} readOnly spellCheck={false} style={{ minHeight: "12rem" }} />
      </label>
    </section>
  );
}
