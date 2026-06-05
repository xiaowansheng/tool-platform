"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface PingEntry {
  id: number;
  time: string;
  latency: number;
  success: boolean;
  statusCode?: number;
}

const MAX_POINTS = 60;

export default function RealtimePingMonitorTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [interval, setIntervalMs] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<PingEntry[]>([]);
  const [stats, setStats] = useState({ avg: 0, min: 0, max: 0, loss: 0 });
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef = useRef(1);
  const historyRef = useRef<PingEntry[]>([]);

  function drawChart(entries: PingEntry[]) {
    const canvas = canvasRef.current;
    if (!canvas || entries.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.scale(dpr, dpr);
    const maxLat = Math.max(...entries.map(e => e.latency), 100);
    const pad = 8;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2;
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    entries.forEach((e, i) => {
      const x = pad + (i / (entries.length - 1 || 1)) * chartW;
      const y = pad + chartH - (e.latency / maxLat) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    entries.forEach((e, i) => {
      const x = pad + (i / (entries.length - 1 || 1)) * chartW;
      const y = pad + chartH - (e.latency / maxLat) * chartH;
      ctx.fillStyle = e.success ? "#22d3ee" : "#f87171";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#64748b";
    ctx.font = "11px monospace";
    ctx.fillText(`max: ${Math.round(maxLat)}ms`, pad, 14);
    ctx.fillText(`min: ${Math.round(Math.min(...entries.map(e => e.latency)))}ms`, w - 80, 14);
  }

  const doPing = useCallback(async () => {
    const id = idRef.current++;
    const ts = new Date().toLocaleTimeString();
    const start = performance.now();
    try {
      const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
      const latency = Math.round(performance.now() - start);
      const entry: PingEntry = { id, time: ts, latency, success: true, statusCode: res.status };
      historyRef.current = [...historyRef.current, entry].slice(-MAX_POINTS);
      setHistory(historyRef.current);
    } catch {
      const latency = Math.round(performance.now() - start);
      const entry: PingEntry = { id, time: ts, latency, success: false };
      historyRef.current = [...historyRef.current, entry].slice(-MAX_POINTS);
      setHistory(historyRef.current);
    }
  }, [url]);

  useEffect(() => {
    if (history.length === 0) return;
    const values = history.filter(e => e.success).map(e => e.latency);
    const losses = history.filter(e => !e.success).length;
    setStats({
      avg: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
      loss: Math.round((losses / history.length) * 100)
    });
    drawChart(history);
  }, [history]);

  function startMonitor() {
    historyRef.current = [];
    setHistory([]);
    setIsRunning(true);
    setError("");
    doPing();
    timerRef.current = setInterval(doPing, interval);
  }

  function stopMonitor() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
  }

  useEffect(() => () => stopMonitor(), []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时监控</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>目标 URL</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/ping" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>间隔</span>
          <select value={interval} onChange={e => setIntervalMs(Number(e.target.value))}>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </label>
        <button type="button" className="button--primary" onClick={startMonitor} disabled={isRunning}>开始</button>
        <button type="button" onClick={stopMonitor} disabled={!isRunning}>停止</button>
        <button type="button" onClick={() => { stopMonitor(); setHistory([]); historyRef.current = []; setStats({ avg: 0, min: 0, max: 0, loss: 0 }); }}>清空</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态</h3><p>{isRunning ? "监控中" : "停止"}</p></article>
        <article className="detail-card"><h3>平均</h3><p>{stats.avg}ms</p></article>
        <article className="detail-card"><h3>最低</h3><p>{stats.min}ms</p></article>
        <article className="detail-card"><h3>最高</h3><p>{stats.max}ms</p></article>
        <article className="detail-card"><h3>丢包率</h3><p>{stats.loss}%</p></article>
        <article className="detail-card"><h3>采样数</h3><p>{history.length}</p></article>
      </div>
      <canvas ref={canvasRef} width={800 * (window.devicePixelRatio || 1)} height={200 * (window.devicePixelRatio || 1)}
        style={{ width: "100%", height: 200, borderRadius: "var(--radius-lg)", background: "#0f172a" }} />
      <div className="tool-table" style={{ maxHeight: 200, overflow: "auto" }}>
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "5rem 4rem 1fr" }}>
          <span>时间</span><span>延迟</span><span>状态</span>
        </div>
        {[...history].reverse().slice(0, 30).map(e => (
          <div key={e.id} className="tool-table__row" style={{ gridTemplateColumns: "5rem 4rem 1fr" }}>
            <span>{e.time}</span>
            <span className="mono-output" style={{ color: e.success ? "#22d3ee" : "#f87171" }}>{e.success ? `${e.latency}ms` : "超时"}</span>
            <span>{e.success ? `HTTP ${e.statusCode ?? 200}` : "失败"}</span>
          </div>
        ))}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">通过 HTTP HEAD 请求探测目标可达性与延迟；CORS 策略下 `no-cors` 模式只能检测到/超时。</p>
    </section>
  );
}
