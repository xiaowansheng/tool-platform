"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ClickEvent {
  button: number;
  x: number;
  y: number;
  time: number;
  double: boolean;
}

const BUTTON_NAMES = ["左键", "中键", "右键", "后退", "前进"];
const BUTTON_COLORS = ["#6366f1", "#f59e0b", "#ef4444", "#22c55e", "#ec4899"];

export default function MouseTesterTool({ manifest }: ToolAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const [scrollDelta, setScrollDelta] = useState(0);
  const [doubleClickMs, setDoubleClickMs] = useState<number | null>(null);
  const [doubleClickCount, setDoubleClickCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mouseDown, setMouseDown] = useState(false);
  const [activeButton, setActiveButton] = useState(-1);
  const lastClickRef = useRef<{ button: number; time: number } | null>(null);
  const scrollRef = useRef(0);
  const dotsRef = useRef<Array<{ x: number; y: number; button: number }>>([]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    for (const dot of dotsRef.current) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = BUTTON_COLORS[dot.button] ?? "#6366f1";
      ctx.globalAlpha = 0.75;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = 360;
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener("wheel", prevent, { passive: false });
    return () => canvas.removeEventListener("wheel", prevent);
  }, []);

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const now = performance.now();

    setMouseDown(true);
    setActiveButton(e.button);

    let isDouble = false;
    if (lastClickRef.current && lastClickRef.current.button === e.button) {
      const delta = now - lastClickRef.current.time;
      if (delta < 500) {
        isDouble = true;
        setDoubleClickMs(Math.round(delta));
        setDoubleClickCount(prev => prev + 1);
      }
    }
    lastClickRef.current = { button: e.button, time: now };

    dotsRef.current = [...dotsRef.current, { x, y, button: e.button }].slice(-300);
    setClicks(prev => [{ button: e.button, x: Math.round(x), y: Math.round(y), time: now, double: isDouble }, ...prev].slice(0, 100));
    drawCanvas();
  }

  function handleMouseUp() {
    setMouseDown(false);
    setActiveButton(-1);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setPosition({ x: Math.round((e.clientX - rect.left) * scaleX), y: Math.round((e.clientY - rect.top) * scaleY) });
  }

  function handleWheel(e: React.WheelEvent) {
    scrollRef.current += e.deltaY;
    setScrollY(Math.round(scrollRef.current));
    setScrollDelta(Math.round(e.deltaY));
  }

  const buttonCounts = clicks.reduce<Record<number, number>>((acc, c) => {
    acc[c.button] = (acc[c.button] || 0) + 1;
    return acc;
  }, {});

  function clearAll() {
    dotsRef.current = [];
    drawCanvas();
    setClicks([]);
    setScrollY(0);
    scrollRef.current = 0;
    setDoubleClickCount(0);
    setDoubleClickMs(null);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">硬件测试</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="detail-grid" style={{ marginBottom: 12 }}>
        <article className="detail-card">
          <h4>坐标</h4>
          <p className="mono-output">{position.x}, {position.y}</p>
        </article>
        <article className="detail-card">
          <h4>状态</h4>
          <p>{mouseDown ? `${BUTTON_NAMES[activeButton] ?? `按钮${activeButton}`} 按下` : "释放"}</p>
        </article>
        <article className="detail-card">
          <h4>双击间隔</h4>
          <p>{doubleClickMs != null ? `${doubleClickMs} ms` : "未检测"}</p>
        </article>
        <article className="detail-card">
          <h4>双击次数</h4>
          <p>{doubleClickCount} 次</p>
        </article>
        <article className="detail-card">
          <h4>滚轮累计</h4>
          <p>{scrollY} px</p>
        </article>
        <article className="detail-card">
          <h4>滚轮增量</h4>
          <p>{scrollDelta} px</p>
        </article>
        {Object.entries(buttonCounts).map(([btn, count]) => (
          <article key={btn} className="detail-card">
            <h4>{BUTTON_NAMES[Number(btn)] ?? `按钮${btn}`}</h4>
            <p>{count} 次</p>
          </article>
        ))}
      </div>

      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border, #475569)" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onContextMenu={e => e.preventDefault()}
          style={{ display: "block", width: "100%", cursor: "crosshair" }}
        />
        <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: "0.7rem", color: "rgba(148,163,184,0.6)" }}>
          左:紫 · 中:黄 · 右:红
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="button--small" onClick={clearAll}>清除</button>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>在上方区域点击、移动或滚动测试</span>
      </div>
    </section>
  );
}
