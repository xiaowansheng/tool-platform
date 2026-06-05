"use client";

import { useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const BEAT_PATTERNS = [
  { name: "4/4", beats: 4, unit: 4 },
  { name: "3/4", beats: 3, unit: 4 },
  { name: "6/8", beats: 6, unit: 8 },
  { name: "2/4", beats: 2, unit: 4 },
  { name: "5/4", beats: 5, unit: 4 },
];

const TEMPO_PRESETS = [
  { name: "Largo", bpm: 50 }, { name: "Adagio", bpm: 70 },
  { name: "Andante", bpm: 90 }, { name: "Moderato", bpm: 114 },
  { name: "Allegro", bpm: 144 }, { name: "Presto", bpm: 184 },
];

export default function VisualMetronomeTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const ctxRef = useRef<AudioContext | null>(null);
  const [bpm, setBpm] = useState(120);
  const [patternIdx, setPatternIdx] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const nextTickRef = useRef(0);
  const beatRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  function playTick(ctx: AudioContext, isDownbeat: boolean) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = isDownbeat ? 880 : 660;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  function scheduleTick() {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const pattern = BEAT_PATTERNS[patternIdx];
    const interval = 60 / bpm;
    const now = ctx.currentTime;
    if (nextTickRef.current < now) nextTickRef.current = now;
    while (nextTickRef.current < now + 0.2) {
      const isDownbeat = beatRef.current === 0;
      playTick(ctx, isDownbeat);
      setActiveBeat(beatRef.current);
      beatRef.current = (beatRef.current + 1) % pattern.beats;
      nextTickRef.current += interval;
    }
    timerRef.current = setTimeout(scheduleTick, 50);
  }

  function start() {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    beatRef.current = 0;
    nextTickRef.current = ctx.currentTime + 0.05;
    startRef.current = performance.now();
    setIsPlaying(true);
    scheduleTick();
  }

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    ctxRef.current?.close();
    ctxRef.current = null;
    setIsPlaying(false);
    setActiveBeat(-1);
  }

  function tapTempo() {
    const now = performance.now();
    const next = [...tapTimes, now].slice(-5);
    setTapTimes(next);
    if (next.length >= 3) {
      const avg = next.slice(1).reduce((sum, t, i) => sum + (t - next[i]), 0) / (next.length - 1);
      const estimated = Math.round(60000 / avg);
      if (estimated >= 20 && estimated <= 300) setBpm(estimated);
    }
  }

  useEffect(() => () => stop(), []);

  const pattern = BEAT_PATTERNS[patternIdx];
  const pendulumAngle = isPlaying ? ((activeBeat / pattern.beats) * 360 - 90) : -90;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时节拍</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>BPM</span>
          <input type="range" min={20} max={300} value={bpm} onChange={e => setBpm(Number(e.target.value))} />
          <span className="mono-output">{bpm}</span>
        </label>
        <label className="tool-field tool-field--compact">
          <span>拍号</span>
          <select value={patternIdx} onChange={e => setPatternIdx(Number(e.target.value))}>
            {BEAT_PATTERNS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={start} disabled={isPlaying}>开始</button>
        <button type="button" onClick={stop} disabled={!isPlaying}>停止</button>
        <button type="button" onClick={tapTempo} disabled={isPlaying}>Tap 测速</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>速度</h3><p>{bpm} BPM</p></article>
        <article className="detail-card"><h3>拍号</h3><p>{pattern.name}</p></article>
        <article className="detail-card"><h3>节拍</h3><p>{activeBeat >= 0 ? `${activeBeat + 1}/${pattern.beats}` : "-"}</p></article>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "24px 0" }}>
        {Array.from({ length: pattern.beats }).map((_, i) => (
          <div key={i} style={{
            width: 48, height: 48, borderRadius: "50%",
            background: i === activeBeat ? "#6366f1" : i === 0 ? "#f59e0b" : "#334155",
            transition: "all 0.08s ease",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: i === activeBeat ? "white" : "#94a3b8",
            fontWeight: 700, fontSize: 18,
            boxShadow: i === activeBeat ? "0 0 20px rgba(99,102,241,0.5)" : "none"
          }}>{i + 1}</div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{
          width: 4, height: 120, margin: "0 auto",
          background: "linear-gradient(to top, #6366f1 50%, transparent 50%)",
          transform: `rotate(${pendulumAngle}deg)`,
          transformOrigin: "bottom center",
          transition: isPlaying ? "transform 0.05s linear" : "transform 0.3s ease",
          borderRadius: 4
        }} />
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>摆锤</p>
      </div>
      <p className="tool-note">高精度节拍器使用 Web Audio API 调度，适合音乐练习和节奏训练。</p>
    </section>
  );
}
