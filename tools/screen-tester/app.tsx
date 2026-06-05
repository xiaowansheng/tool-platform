"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const SOLID_COLORS = [
  { label: "白", color: "#ffffff" },
  { label: "红", color: "#ff0000" },
  { label: "绿", color: "#00ff00" },
  { label: "蓝", color: "#0000ff" },
  { label: "青", color: "#00ffff" },
  { label: "品红", color: "#ff00ff" },
  { label: "黄", color: "#ffff00" },
  { label: "黑", color: "#000000" },
];

type TestMode = "solid" | "gradient-r" | "gradient-g" | "gradient-b" | "gradient-gray" | "grid" | "checker";

function drawSolid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

function drawGradient(ctx: CanvasRenderingContext2D, w: number, h: number, channel: "r" | "g" | "b" | "gray") {
  for (let x = 0; x < w; x++) {
    const t = x / w;
    const c = channel === "r" ? `rgb(${Math.round(t * 255)},0,0)`
      : channel === "g" ? `rgb(0,${Math.round(t * 255)},0)`
      : channel === "b" ? `rgb(0,0,${Math.round(t * 255)})`
      : `rgb(${Math.round(t * 255)},${Math.round(t * 255)},${Math.round(t * 255)})`;
    ctx.fillStyle = c;
    ctx.fillRect(x, 0, 1, h);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  const step = 40;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 2;
  ctx.strokeRect(step * 4, step * 4, step * 2, step * 2);
}

function drawChecker(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 4;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? "#ffffff" : "#000000";
      ctx.fillRect(x, y, size, size);
    }
  }
}

export default function ScreenTesterTool({ manifest }: ToolAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<TestMode>("solid");
  const [solidColor, setSolidColor] = useState("#ffffff");
  const [fullscreen, setFullscreen] = useState(false);
  const fsRef = useRef<HTMLDivElement>(null);

  const render = useCallback((m: TestMode, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width, h = canvas.height;
    if (m === "solid") {
      drawSolid(ctx, w, h, color);
    } else if (m.startsWith("gradient-")) {
      drawGradient(ctx, w, h, m.replace("gradient-", "") as "r" | "g" | "b" | "gray");
    } else if (m === "grid") {
      drawGrid(ctx, w, h);
    } else if (m === "checker") {
      drawChecker(ctx, w, h);
    }
  }, []);

  const apply = useCallback((m: TestMode, color: string) => {
    setMode(m);
    setSolidColor(color);
    requestAnimationFrame(() => render(m, color));
  }, [render]);

  useEffect(() => {
    function onResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render(mode, solidColor);
    }
    if (fullscreen) {
      onResize();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [fullscreen, mode, solidColor, render]);

  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      fsRef.current?.requestFullscreen().then(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          render(mode, solidColor);
        }
      });
    } else {
      document.exitFullscreen();
    }
  }

  function handleCanvasClick() {
    if (!fullscreen) return;
    if (mode !== "solid") return;
    const idx = SOLID_COLORS.findIndex(c => c.color === solidColor);
    const next = (idx + 1) % SOLID_COLORS.length;
    apply("solid", SOLID_COLORS[next].color);
  }

  return (
    <div ref={fsRef}>
      <section className="tool-panel" style={fullscreen ? { padding: 0 } : undefined}>
        {!fullscreen && (
          <>
            <div className="tool-panel__header">
              <div><p className="eyebrow">硬件测试</p><h2>{manifest.name}</h2></div>
              <p>{manifest.description}</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: "0.8rem", marginBottom: 6 }}>纯色测试（检测坏点）</h4>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SOLID_COLORS.map(c => (
                  <button key={c.label} type="button" onClick={() => apply("solid", c.color)} style={{
                    width: 36, height: 36, borderRadius: 6, border: `2px solid ${mode === "solid" && solidColor === c.color ? "var(--color-primary, #6366f1)" : "var(--border, #475569)"}`,
                    background: c.color, cursor: "pointer",
                  }} title={c.label} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: "0.8rem", marginBottom: 6 }}>渐变测试（检测色阶/带化）</h4>
              <div style={{ display: "flex", gap: 6 }}>
                {([
                  ["gradient-r", "红通道"],
                  ["gradient-g", "绿通道"],
                  ["gradient-b", "蓝通道"],
                  ["gradient-gray", "灰阶"],
                ] as const).map(([m, label]) => (
                  <button key={m} type="button" className="button--small" onClick={() => apply(m, solidColor)} style={{
                    background: mode === m ? "var(--color-primary, #6366f1)" : undefined,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: "0.8rem", marginBottom: 6 }}>图案测试</h4>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="button--small" onClick={() => apply("grid", solidColor)} style={{ background: mode === "grid" ? "var(--color-primary, #6366f1)" : undefined }}>网格</button>
                <button type="button" className="button--small" onClick={() => apply("checker", solidColor)} style={{ background: mode === "checker" ? "var(--color-primary, #6366f1)" : undefined }}>棋盘格</button>
              </div>
            </div>
          </>
        )}

        <div style={{
          position: "relative",
          borderRadius: fullscreen ? 0 : 8,
          overflow: "hidden",
          border: fullscreen ? "none" : "1px solid var(--border, #475569)",
          height: fullscreen ? "100vh" : 340,
          background: "#000",
        }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              cursor: fullscreen ? "pointer" : "default",
            }}
          />
        </div>

        {!fullscreen && (
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="button--primary" onClick={toggleFullscreen}>全屏测试</button>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>全屏模式下点击切换颜色，更容易发现坏点</span>
          </div>
        )}
      </section>
    </div>
  );
}
