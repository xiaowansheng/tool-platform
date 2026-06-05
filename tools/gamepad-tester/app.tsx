"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const STANDARD_BUTTONS = [
  "A", "B", "X", "Y", "LB", "RB", "LT", "RT",
  "Back", "Start", "L3", "R3", "Up", "Down", "Left", "Right", "Home",
];

const STANDARD_AXES = ["LX", "LY", "RX", "RY"];

function drawStick(ctx: CanvasRenderingContext2D, x: number, y: number, ax: number, ay: number, label: string) {
  const r = 50;
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "var(--bg-input, #1e293b)";
  ctx.fill();
  ctx.strokeStyle = "var(--border, #475569)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
  ctx.moveTo(0, -r); ctx.lineTo(0, r);
  ctx.strokeStyle = "var(--text-muted, #475569)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  const dotX = ax * (r - 8), dotY = ay * (r - 8);
  ctx.beginPath();
  ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#6366f1";
  ctx.fill();

  ctx.fillStyle = "var(--text-muted, #94a3b8)";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, r + 16);
  ctx.fillText(`(${ax.toFixed(2)}, ${ay.toFixed(2)})`, 0, r + 28);
  ctx.restore();
}

function drawTrigger(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, label: string) {
  const w = 120, h = 16;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "var(--bg-input, #1e293b)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#6366f1";
  ctx.fillRect(0, 0, w * value, h);
  ctx.strokeStyle = "var(--border, #475569)";
  ctx.strokeRect(0, 0, w, h);
  ctx.fillStyle = "var(--text-muted, #94a3b8)";
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`${label}: ${(value * 100).toFixed(0)}%`, 0, h + 14);
  ctx.restore();
}

export default function GamepadTesterTool({ manifest }: ToolAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gamepadId, setGamepadId] = useState<string | null>(null);
  const [buttons, setButtons] = useState<number[]>([]);
  const [connected, setConnected] = useState(false);
  const rafRef = useRef<number>(0);

  const poll = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gp = gamepads.find(g => g != null);
    if (!gp) { rafRef.current = requestAnimationFrame(poll); return; }

    setGamepadId(gp.id);
    setConnected(true);
    setButtons(Array.from(gp.buttons.map(b => b.value)));

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawStick(ctx, 140, 80, gp.axes[0] ?? 0, gp.axes[1] ?? 0, "左摇杆");
        drawStick(ctx, 420, 80, gp.axes[2] ?? 0, gp.axes[3] ?? 0, "右摇杆");
        const lt = gp.buttons[6]?.value ?? 0;
        const rt = gp.buttons[7]?.value ?? 0;
        drawTrigger(ctx, 80, 170, lt, "LT");
        drawTrigger(ctx, 360, 170, rt, "RT");
      }
    }
    rafRef.current = requestAnimationFrame(poll);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [poll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = Math.min(Math.floor(rect.width), 600);
    canvas.height = 220;
  }, []);

  function vibrate(duration = 200, strong = 0.5, weak = 0.5) {
    const gp = navigator.getGamepads().find(g => g != null);
    if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect("dual-rumble", { startDelay: 0, duration, strongMagnitude: strong, weakMagnitude: weak });
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">硬件测试</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      {connected ? (
        <>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
            已连接: <span className="mono-output">{gamepadId}</span>
          </p>
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border, #475569)", marginBottom: 12 }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
          </div>

          <h3 style={{ fontSize: "0.85rem", marginBottom: 8 }}>按键状态</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {STANDARD_BUTTONS.map((name, i) => {
              const v = buttons[i] ?? 0;
              return (
                <div key={i} style={{
                  padding: "4px 10px", borderRadius: 4, fontSize: "0.75rem", fontFamily: "monospace",
                  background: v > 0.1 ? "var(--color-primary, #6366f1)" : "var(--bg-input, #334155)",
                  color: v > 0.1 ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${v > 0.1 ? "var(--color-primary-light, #818cf8)" : "var(--border, #475569)"}`,
                }}>
                  {name}{v > 0 && v < 1 ? ` ${(v * 100).toFixed(0)}%` : ""}
                </div>
              );
            })}
          </div>

          {typeof navigator.getGamepads === "function" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="button--small" onClick={() => vibrate(200, 0.5, 0.5)}>轻震动</button>
              <button type="button" className="button--small" onClick={() => vibrate(300, 1, 1)}>强震动</button>
              <button type="button" className="button--small" onClick={() => vibrate(100, 0, 1)}>弱马达</button>
              <button type="button" className="button--small" onClick={() => vibrate(100, 1, 0)}>强马达</button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ fontSize: "1.2rem", marginBottom: 8 }}>未检测到手柄</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>请连接 USB 或蓝牙手柄，然后按任意按钮激活</p>
        </div>
      )}
    </section>
  );
}
