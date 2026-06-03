"use client";

import { useState, useRef, useCallback } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function AudioWaveformVisualizer({ manifest }: ToolAppProps) {
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);
  const [channels, setChannels] = useState(0);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processAudio = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      setDuration(audioBuffer.duration);
      setSampleRate(audioBuffer.sampleRate);
      setChannels(audioBuffer.numberOfChannels);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const data = audioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / width);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, width, height);

      // Draw center line
      ctx.strokeStyle = "rgba(128, 128, 128, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw waveform
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j] ?? 0;
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        const yMin = ((1 + min) * height) / 2;
        const yMax = ((1 + max) * height) / 2;

        ctx.moveTo(i, yMin);
        ctx.lineTo(i, yMax);
      }

      ctx.stroke();

      // Draw RMS envelope
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j] ?? 0;
          sum += datum * datum;
        }
        const rms = Math.sqrt(sum / step);
        const yTop = height / 2 - (rms * height) / 2;
        const yBottom = height / 2 + (rms * height) / 2;
        ctx.moveTo(i, yTop);
        ctx.lineTo(i, yBottom);
      }
      ctx.stroke();

      await audioCtx.close();
    } catch (err) {
      console.error("Failed to decode audio:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processAudio(file);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">音频工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>选择音频文件</span>
          <input type="file" accept="audio/*" onChange={handleFile} />
        </label>
      </div>

      {loading && <p style={{ textAlign: "center", padding: 16 }}>正在解码音频...</p>}

      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        style={{
          width: "100%",
          height: 300,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          display: fileName ? "block" : "none"
        }}
      />

      {duration > 0 && (
        <div className="detail-grid">
          <article className="detail-card">
            <h3>文件名</h3>
            <p style={{ fontSize: 13, wordBreak: "break-all" }}>{fileName}</p>
          </article>
          <article className="detail-card">
            <h3>时长</h3>
            <p>{duration.toFixed(2)}s</p>
          </article>
          <article className="detail-card">
            <h3>采样率</h3>
            <p>{sampleRate.toLocaleString()} Hz</p>
          </article>
          <article className="detail-card">
            <h3>声道数</h3>
            <p>{channels === 1 ? "单声道" : channels === 2 ? "立体声" : `${channels} 声道`}</p>
          </article>
          <article className="detail-card">
            <h3>总采样点</h3>
            <p>{Math.round(duration * sampleRate).toLocaleString()}</p>
          </article>
          <article className="detail-card">
            <h3>图例</h3>
            <p style={{ fontSize: 12 }}>
              <span style={{ color: "#6366f1" }}>■</span> 峰值 &nbsp;
              <span style={{ color: "#ef4444" }}>■</span> RMS 均值
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
