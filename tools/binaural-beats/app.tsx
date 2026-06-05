"use client";

import { useRef, useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const PRESETS = [
  { name: "Delta (深度睡眠)", left: 200, right: 204, label: "0.5-4 Hz" },
  { name: "Theta (冥想)", left: 200, right: 206, label: "4-8 Hz" },
  { name: "Alpha (放松)", left: 200, right: 210, label: "8-14 Hz" },
  { name: "Beta (专注)", left: 200, right: 220, label: "14-30 Hz" },
  { name: "Gamma (高认知)", left: 200, right: 240, label: "40+ Hz" },
];

export default function BinauralBeatsTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const ctxRef = useRef<AudioContext | null>(null);
  const leftOscRef = useRef<OscillatorNode | null>(null);
  const rightOscRef = useRef<OscillatorNode | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const [leftFreq, setLeftFreq] = useState(200);
  const [rightFreq, setRightFreq] = useState(210);
  const [volume, setVolume] = useState(0.5);
  const [noiseVolume, setNoiseVolume] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startAudio() {
    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    gainRef.current = masterGain;

    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = leftFreq;
    const leftGain = ctx.createGain();
    leftGain.gain.value = 0.5;
    const merger = ctx.createChannelMerger(2);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = rightFreq;
    const rightGain = ctx.createGain();
    rightGain.gain.value = 0.5;
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);
    merger.connect(masterGain);

    leftOsc.start();
    rightOsc.start();
    leftOscRef.current = leftOsc;
    rightOscRef.current = rightOsc;

    if (noiseVolume > 0) {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = noiseVolume * 0.1;
      noise.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start();
      noiseRef.current = noise;
      noiseGainRef.current = noiseGain;
    }

    ctxRef.current = ctx;
    setIsPlaying(true);

    if (timer > 0) {
      setRemaining(timer * 60);
      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) { stopAudio(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function stopAudio() {
    leftOscRef.current?.stop();
    rightOscRef.current?.stop();
    noiseRef.current?.stop();
    ctxRef.current?.close();
    leftOscRef.current = null;
    rightOscRef.current = null;
    noiseRef.current = null;
    ctxRef.current = null;
    gainRef.current = null;
    setIsPlaying(false);
    setRemaining(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => () => stopAudio(), []);

  const beatHz = Math.abs(rightFreq - leftFreq);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时音频</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>预设</span>
          <select onChange={e => {
            const preset = PRESETS[Number(e.target.value)];
            if (preset) { setLeftFreq(preset.left); setRightFreq(preset.right); }
          }}>
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={startAudio} disabled={isPlaying}>播放</button>
        <button type="button" onClick={stopAudio} disabled={!isPlaying}>停止</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态</h3><p>{isPlaying ? "播放中" : "停止"}</p></article>
        <article className="detail-card"><h3>左耳</h3><p>{leftFreq} Hz</p></article>
        <article className="detail-card"><h3>右耳</h3><p>{rightFreq} Hz</p></article>
        <article className="detail-card"><h3>节拍差</h3><p>{beatHz} Hz</p></article>
        {remaining > 0 && <article className="detail-card"><h3>剩余</h3><p>{formatTime(remaining)}</p></article>}
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>左耳频率</span>
          <input type="range" min={100} max={500} value={leftFreq} onChange={e => setLeftFreq(Number(e.target.value))} />
          <span className="mono-output">{leftFreq}</span>
        </label>
        <label className="tool-field tool-field--compact">
          <span>右耳频率</span>
          <input type="range" min={100} max={500} value={rightFreq} onChange={e => setRightFreq(Number(e.target.value))} />
          <span className="mono-output">{rightFreq}</span>
        </label>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>音量</span>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => {
            setVolume(Number(e.target.value));
            if (gainRef.current) gainRef.current.gain.value = Number(e.target.value);
          }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>粉红噪音</span>
          <input type="range" min={0} max={1} step={0.05} value={noiseVolume} onChange={e => setNoiseVolume(Number(e.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>定时 (分钟)</span>
          <input type="number" min={0} max={120} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: 80 }} />
        </label>
      </div>
      <p className="tool-note">双耳节拍通过左右耳不同频率的纯音在大脑中产生节拍感知。建议使用耳机以获得最佳效果。</p>
    </section>
  );
}
