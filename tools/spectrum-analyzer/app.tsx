"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const FFT_OPTIONS = [256, 512, 1024, 2048, 4096];
const WINDOW_OPTIONS = ["hanning", "hamming", "blackman", "rectangular"];

function applyWindow(data: Float32Array, type: string): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const n = data.length;
    out[i] = data[i] * (
      type === "hanning" ? 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1))) :
      type === "hamming" ? 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)) :
      type === "blackman" ? 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (n - 1)) :
      1
    );
  }
  return out;
}

export default function SpectrumAnalyzerTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const [fftSize, setFftSize] = useState(1024);
  const [windowType, setWindowType] = useState("hanning");
  const [isActive, setIsActive] = useState(false);
  const [peakFreq, setPeakFreq] = useState(0);
  const [peakDb, setPeakDb] = useState(-Infinity);
  const [error, setError] = useState("");

  const startCapture = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      setIsActive(true);
      draw();
    } catch (err) {
      setError(err instanceof Error ? err.message : "麦克风访问被拒绝");
    }
  }, [fftSize]);

  function stopCapture() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    analyserRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    setIsActive(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
  }

  function draw() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.scale(dpr, dpr);
    const windowed = applyWindow(dataArray, windowType);
    let maxVal = -Infinity;
    let maxIdx = 0;
    const barWidth = w / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const val = Math.max(windowed[i], -120);
      const pct = (val + 120) / 120;
      const barH = pct * h * 0.9;
      const hue = 240 - pct * 240;
      ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
      ctx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 0.5), barH);
      if (windowed[i] > maxVal) { maxVal = windowed[i]; maxIdx = i; }
    }
    const sampleRate = audioCtxRef.current?.sampleRate || 44100;
    const peakHertz = (maxIdx / bufferLength) * sampleRate / 2;
    setPeakFreq(Math.round(peakHertz));
    setPeakDb(Math.round(maxVal));
    animRef.current = requestAnimationFrame(draw);
  }

  useEffect(() => () => { stopCapture(); }, []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时音频</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>FFT 大小</span>
          <select value={fftSize} onChange={e => setFftSize(Number(e.target.value))}>
            {FFT_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>窗口</span>
          <select value={windowType} onChange={e => setWindowType(e.target.value)}>
            {WINDOW_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={startCapture} disabled={isActive}>开始采集</button>
        <button type="button" onClick={stopCapture} disabled={!isActive}>停止</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态</h3><p>{isActive ? "采集中" : "空闲"}</p></article>
        <article className="detail-card"><h3>峰值频率</h3><p>{peakFreq} Hz</p></article>
        <article className="detail-card"><h3>峰值强度</h3><p>{peakDb} dB</p></article>
      </div>
      <canvas ref={canvasRef} width={800 * (window.devicePixelRatio || 1)} height={300 * (window.devicePixelRatio || 1)}
        style={{ width: "100%", height: 300, borderRadius: "var(--radius-lg)", background: "#0f172a" }} />
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">通过麦克风采集实时音频并计算 FFT 频谱；峰值频率检测可识别音高。</p>
    </section>
  );
}
