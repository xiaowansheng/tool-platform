"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Frame {
  url: string;
  delay: number;
}

export default function GifSplitterTool({ manifest }: ToolAppProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [gifUrl, setGifUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [totalDuration, setTotalDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    for (const f of frames) URL.revokeObjectURL(f.url);
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setFrames([]);
    setGifUrl("");
    setTotalDuration(0);
    setError("");
  }

  async function handleFile(file: File) {
    reset();
    if (!file.type.includes("gif") && !file.name.endsWith(".gif")) {
      setError("请选择 GIF 文件");
      return;
    }

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setGifUrl(url);
    setBusy(true);

    try {
      // Use a hidden video to extract frames
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "auto";

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("无法读取 GIF 文件"));
        video.src = url;
      });

      const duration = video.duration;
      setTotalDuration(duration);

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;

      const extractedFrames: Frame[] = [];
      // Estimate ~100ms per frame for GIFs, but limit to reasonable count
      const frameCount = Math.min(Math.max(Math.round(duration * 10), 1), 200);
      const frameDelay = duration / frameCount;

      for (let i = 0; i < frameCount; i++) {
        const time = (i / frameCount) * duration;
        video.currentTime = time;
        await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("帧提取失败")), "image/png");
        });
        extractedFrames.push({ url: URL.createObjectURL(blob), delay: Math.round(frameDelay * 1000) });
      }

      setFrames(extractedFrames);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GIF 解析失败");
    } finally {
      setBusy(false);
    }
  }

  function downloadAll() {
    for (let i = 0; i < frames.length; i++) {
      const a = document.createElement("a");
      a.href = frames[i]!.url;
      a.download = `${fileName.replace(/\.gif$/i, "")}-frame-${String(i + 1).padStart(3, "0")}.png`;
      a.click();
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">GIF 工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>GIF 文件</span>
          <input type="file" accept="image/gif,.gif" onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }} />
        </label>
        {frames.length > 0 ? (
          <button type="button" onClick={downloadAll}>全部下载 ({frames.length} 帧)</button>
        ) : null}
      </div>

      {busy ? <p className="tool-note">正在提取帧，请稍候…</p> : null}

      {gifUrl ? (
        <article className="detail-card">
          <p className="eyebrow">GIF 预览</p>
          <img className="media-preview" src={gifUrl} alt="GIF 预览" />
        </article>
      ) : null}

      <div className="detail-grid">
        <article className="detail-card"><h3>帧数</h3><p>{frames.length || "-"}</p></article>
        <article className="detail-card"><h3>总时长</h3><p>{totalDuration ? `${totalDuration.toFixed(2)}s` : "-"}</p></article>
        <article className="detail-card"><h3>帧率</h3><p>{totalDuration && frames.length ? `${(frames.length / totalDuration).toFixed(1)} fps` : "-"}</p></article>
      </div>

      {frames.length > 0 ? (
        <div className="case-grid">
          {frames.map((frame, i) => (
            <article key={i} className="detail-card">
              <div className="tool-card__header">
                <div><p className="eyebrow">#{i + 1}</p><h3>{frame.delay}ms</h3></div>
                <a className="button-link" href={frame.url} download={`frame-${String(i + 1).padStart(3, "0")}.png`}>下载</a>
              </div>
              <img className="media-preview" src={frame.url} alt={`帧 ${i + 1}`} />
            </article>
          ))}
        </div>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">使用 HTML Video 元素逐帧提取。帧率为估算值，实际 GIF 每帧延迟可能不同。所有处理在浏览器本地完成。</p>
    </section>
  );
}
