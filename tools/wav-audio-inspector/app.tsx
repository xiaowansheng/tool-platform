"use client";

import { useCallback, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface WavHeaderInfo {
  format: string;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataSize: number;
  duration: number;
  fileSize: number;
}

function readUint32LE(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function readUint16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readChunkId(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

function parseWavHeader(buffer: ArrayBuffer): WavHeaderInfo | { error: string } {
  if (buffer.byteLength < 44) {
    return { error: "文件太小，不是有效的 WAV 文件" };
  }

  const view = new DataView(buffer);
  const riffId = readChunkId(view, 0);

  if (riffId !== "RIFF") {
    return { error: `缺少 RIFF 标识，当前: "${riffId}"` };
  }

  const waveId = readChunkId(view, 8);
  if (waveId !== "WAVE") {
    return { error: `缺少 WAVE 标识，当前: "${waveId}"` };
  }

  const fileSize = readUint32LE(view, 4) + 8;
  const audioFormat = readUint16LE(view, 20);
  const channels = readUint16LE(view, 22);
  const sampleRate = readUint32LE(view, 24);
  const byteRate = readUint32LE(view, 28);
  const blockAlign = readUint16LE(view, 32);
  const bitsPerSample = readUint16LE(view, 34);

  let dataSize = 0;
  let offset = 12;
  while (offset < buffer.byteLength - 8) {
    const chunkId = readChunkId(view, offset);
    const chunkSize = readUint32LE(view, offset + 4);
    if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  const duration = dataSize > 0 ? dataSize / byteRate : 0;

  const formatNames: Record<number, string> = {
    1: "PCM (无压缩)",
    3: "IEEE Float",
    6: "A-law",
    7: "μ-law",
    0xFFFE: "Extensible"
  };

  return {
    format: formatNames[audioFormat] ?? `未知 (${audioFormat})`,
    channels,
    sampleRate,
    byteRate,
    blockAlign,
    bitsPerSample,
    dataSize,
    duration,
    fileSize
  };
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  if (secs > 0) return `${secs}.${String(ms).padStart(3, "0")}s`;
  return `${ms}ms`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getBitrateLabel(bitsPerSample: number, sampleRate: number, channels: number): string {
  const bitrate = bitsPerSample * sampleRate * channels;
  if (bitrate >= 1000000) return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  return `${(bitrate / 1000).toFixed(0)} kbps`;
}

export default function WavAudioInspectorTool({ manifest }: ToolAppProps) {
  const [headerInfo, setHeaderInfo] = useState<WavHeaderInfo | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setError("");
    setHeaderInfo(null);

    try {
      const buffer = await file.slice(0, Math.min(file.size, 65536)).arrayBuffer();
      const result = parseWavHeader(buffer);

      if ("error" in result) {
        setError(result.error);
      } else {
        setHeaderInfo({ ...result, fileSize: file.size });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件读取失败");
    }
  }, []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">音频分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <label className="tool-field">
        <span>选择 WAV 文件</span>
        <input
          type="file"
          accept=".wav,audio/wav"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>

      {error && <p className="tool-error">{error}</p>}

      {headerInfo && (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>文件名</h3>
              <p style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{fileName}</p>
            </article>
            <article className="detail-card">
              <h3>编码格式</h3>
              <p>{headerInfo.format}</p>
            </article>
            <article className="detail-card">
              <h3>声道数</h3>
              <p>{headerInfo.channels === 1 ? "单声道" : headerInfo.channels === 2 ? "立体声" : `${headerInfo.channels} 声道`}</p>
            </article>
            <article className="detail-card">
              <h3>采样率</h3>
              <p>{headerInfo.sampleRate.toLocaleString()} Hz</p>
            </article>
            <article className="detail-card">
              <h3>位深度</h3>
              <p>{headerInfo.bitsPerSample} bit</p>
            </article>
            <article className="detail-card">
              <h3>比特率</h3>
              <p>{getBitrateLabel(headerInfo.bitsPerSample, headerInfo.sampleRate, headerInfo.channels)}</p>
            </article>
            <article className="detail-card">
              <h3>时长</h3>
              <p>{formatDuration(headerInfo.duration)}</p>
            </article>
            <article className="detail-card">
              <h3>文件大小</h3>
              <p>{formatFileSize(headerInfo.fileSize)}</p>
            </article>
            <article className="detail-card">
              <h3>数据大小</h3>
              <p>{formatFileSize(headerInfo.dataSize)}</p>
            </article>
          </div>
        </>
      )}

      <p className="tool-note">
        拖放或选择 WAV 文件即可查看头部元数据。
        仅读取文件头部，不会上传文件到服务器。
      </p>
    </section>
  );
}
