"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Result {
  url: string;
  size: number;
  width: number;
  height: number;
  name: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    image.src = url;
  });
}

export default function ImageCompressorTool({ manifest }: ToolAppProps) {
  const [quality, setQuality] = useState(0.78);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [format, setFormat] = useState("image/webp");
  const [originalSize, setOriginalSize] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function compress(file: File) {
    setError("");
    setOriginalSize(file.size);
    if (result?.url) URL.revokeObjectURL(result.url);
    try {
      const image = await loadImage(file);
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available");
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
      if (!blob) throw new Error("Compression failed");
      setResult({ url: URL.createObjectURL(blob), size: blob.size, width, height, name: file.name.replace(/\.[^.]+$/, format === "image/png" ? ".png" : ".webp") });
    } catch (compressError) {
      setError(compressError instanceof Error ? compressError.message : "Compression failed");
      setResult(null);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Image optimization</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>Image</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void compress(file); }} /></label><label className="tool-field tool-field--compact"><span>Quality</span><input type="number" min={0.1} max={1} step={0.05} value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Max width</span><input type="number" min={64} value={maxWidth} onChange={(event) => setMaxWidth(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>Original</h3><p>{formatBytes(originalSize)}</p></article><article className="detail-card"><h3>Compressed</h3><p>{result ? formatBytes(result.size) : "No output"}</p></article><article className="detail-card"><h3>Savings</h3><p>{result && originalSize ? Math.max(0, Math.round((1 - result.size / originalSize) * 100)) + "%" : "0%"}</p></article></div>
      {result ? <div className="detail-card"><h3>{result.width} x {result.height}</h3><img src={result.url} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 8 }} /><a href={result.url} download={result.name}><button type="button">Download compressed image</button></a></div> : null}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
