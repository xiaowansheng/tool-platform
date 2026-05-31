"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type WaveType = OscillatorType;

function createWavBlob(frequency: number, duration: number, volume: number, sampleRate = 44100) {
  const samples = Math.max(1, Math.floor(duration * sampleRate));
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);

  for (let index = 0; index < samples; index += 1) {
    const sample = Math.sin(2 * Math.PI * frequency * index / sampleRate) * volume;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

const statusLabels: Record<string, string> = {
  idle: "空闲",
  stopped: "已停止",
  ended: "播放结束",
  playing: "播放中"
};

export default function AudioToneGeneratorTool({ manifest }: ToolClientProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [frequency, setFrequency] = useState(440);
  const [duration, setDuration] = useState(2);
  const [volume, setVolume] = useState(0.2);
  const [wave, setWave] = useState<WaveType>("sine");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [wavUrl, setWavUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(createWavBlob(frequency, duration, volume));

    setWavUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [duration, frequency, volume]);

  function stop() {
    try {
      oscillatorRef.current?.stop();
    } catch {
      // The oscillator may already have ended naturally.
    }
    oscillatorRef.current?.disconnect();
    gainRef.current?.disconnect();
    oscillatorRef.current = null;
    gainRef.current = null;
    setStatus("stopped");
  }

  async function play() {
    try {
      stop();
      const audioContext = audioContextRef.current ?? new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      audioContextRef.current = audioContext;
      oscillator.type = wave;
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
      oscillator.onended = () => setStatus("ended");
      oscillatorRef.current = oscillator;
      gainRef.current = gain;
      setStatus("playing");
      setError("");
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "播放失败");
    }
  }

  function downloadWav() {
    const anchor = document.createElement("a");
    anchor.href = wavUrl;
    anchor.download = `tone-${frequency}hz.wav`;
    anchor.click();
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
        <button type="button" className="button--primary" onClick={() => void play()}>播放</button>
        <button type="button" onClick={stop}>停止</button>
        <button type="button" onClick={downloadWav}>下载 WAV</button>
        <div className="mono-output">状态：{statusLabels[status] ?? status}</div>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>频率 {frequency} Hz</span><input type="range" min="20" max="20000" step="1" value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>时长 {duration}s</span><input type="range" min="0.1" max="10" step="0.1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>音量 {(volume * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact">
          <span>波形</span>
          <select value={wave} onChange={(event) => setWave(event.target.value as WaveType)}>
            <option value="sine">正弦波</option>
            <option value="square">方波</option>
            <option value="sawtooth">锯齿波</option>
            <option value="triangle">三角波</option>
          </select>
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>周期</h3><p>{(1000 / frequency).toFixed(2)} ms</p></article>
        <article className="detail-card"><h3>采样数</h3><p>{Math.round(duration * 44100).toLocaleString()}</p></article>
        <article className="detail-card"><h3>波形</h3><p>{wave}</p></article>
      </div>

      <audio className="media-audio-preview" controls src={wavUrl} />
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">长时间高音量测试音可能损伤听力或设备，建议从低音量开始并避免佩戴耳机长时间播放。</p>
    </section>
  );
}
