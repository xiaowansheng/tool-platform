"use client";

import { useEffect, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Direction = "horizontal" | "vertical";

interface ImageItem {
  file: File;
  url: string;
  img: HTMLImageElement;
}

function loadImage(file: File): Promise<{ url: string; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ url, img });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
    img.src = url;
  });
}

export default function ImageStitcherTool({ manifest }: ToolAppProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [direction, setDirection] = useState<Direction>("horizontal");
  const [gap, setGap] = useState(0);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [result, setResult] = useState<{ url: string; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  function clearImages() {
    for (const item of images) URL.revokeObjectURL(item.url);
    setImages([]);
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const newItems: ImageItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const { url, img } = await loadImage(file);
        newItems.push({ file, url, img });
      } catch { /* skip invalid */ }
    }

    setImages((prev) => [...prev, ...newItems]);
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  function removeImage(index: number) {
    const item = images[index];
    if (item) { URL.revokeObjectURL(item.url); }
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  async function handleStitch() {
    if (images.length < 2) { setError("请至少添加 2 张图片"); return; }
    setBusy(true); setError("");

    try {
      if (result?.url) URL.revokeObjectURL(result.url);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      if (direction === "horizontal") {
        const maxH = Math.max(...images.map((i) => i.img.naturalHeight));
        canvas.width = images.reduce((s, i) => s + i.img.naturalWidth, 0) + gap * (images.length - 1);
        canvas.height = maxH;
      } else {
        const maxW = Math.max(...images.map((i) => i.img.naturalWidth));
        canvas.width = maxW;
        canvas.height = images.reduce((s, i) => s + i.img.naturalHeight, 0) + gap * (images.length - 1);
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let offset = 0;
      for (const item of images) {
        if (direction === "horizontal") {
          ctx.drawImage(item.img, offset, 0);
          offset += item.img.naturalWidth + gap;
        } else {
          ctx.drawImage(item.img, 0, offset);
          offset += item.img.naturalHeight + gap;
        }
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("导出失败")), "image/png");
      });
      setResult({ url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "拼接失败");
    } finally { setBusy(false); }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">图像拼接</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>添加图片</span>
          <input type="file" accept="image/*" multiple onChange={(e) => void handleFiles(e.target.files)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>拼接方向</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            <option value="horizontal">横向拼接</option>
            <option value="vertical">纵向拼接</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>间距 (px)</span>
          <input type="number" min="0" max="100" value={gap} onChange={(e) => setGap(Number(e.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景色</span>
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleStitch()} disabled={busy || images.length < 2}>
          {busy ? "拼接中…" : `拼接 ${images.length} 张图片`}
        </button>
        {images.length > 0 ? <button type="button" onClick={clearImages}>清空</button> : null}
      </div>

      {images.length > 0 ? (
        <div className="case-grid">
          {images.map((item, i) => (
            <article key={i} className="detail-card">
              <div className="tool-card__header">
                <div><p className="eyebrow">#{i + 1}</p><h3>{item.img.naturalWidth}×{item.img.naturalHeight}</h3></div>
                <button type="button" onClick={() => removeImage(i)}>移除</button>
              </div>
              <img className="media-preview" src={item.url} alt={`图片 ${i + 1}`} />
            </article>
          ))}
        </div>
      ) : null}

      {result ? (
        <article className="detail-card">
          <p className="eyebrow">拼接结果 ({result.width} × {result.height})</p>
          <img className="media-preview" src={result.url} alt="拼接结果" />
          <div className="tool-toolbar">
            <a className="button-link button-link--accent" href={result.url} download="stitched.png">下载</a>
          </div>
        </article>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">图片按添加顺序排列。拼接在浏览器本地 Canvas 中完成，不上传。</p>
    </section>
  );
}
