"use client";

import { useEffect, useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type OutputFormat = "image/jpeg" | "image/webp" | "image/png";

interface CompressionResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

const formatExtensions: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png"
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, format: OutputFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("当前浏览器无法导出该图片格式"));
      }
    }, format, format === "image/png" ? undefined : quality);
  });
}

function targetSize(width: number, height: number, maxWidth: number) {
  if (maxWidth <= 0 || width <= maxWidth) {
    return { width, height };
  }

  const ratio = maxWidth / width;

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
}

async function compressImage(file: File, format: OutputFormat, quality: number, maxWidth: number): Promise<CompressionResult> {
  const image = await loadImage(file);
  const size = targetSize(image.naturalWidth || image.width, image.naturalHeight || image.height, maxWidth);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D");
  }

  canvas.width = size.width;
  canvas.height = size.height;
  context.drawImage(image, 0, 0, size.width, size.height);

  const blob = await canvasToBlob(canvas, format, quality);

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: size.width,
    height: size.height
  };
}

function outputName(fileName: string, format: OutputFormat) {
  const base = fileName.replace(/\.[^.]+$/, "") || "image";

  return `${base}-compressed.${formatExtensions[format]}`;
}

export default function ImageCompressorTool({ manifest }: ToolClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(0.78);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const savedPercent = useMemo(() => {
    if (!file || !result) return 0;

    return Math.max(0, Math.round((1 - result.blob.size / file.size) * 100));
  }, [file, result]);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result?.url]);

  function handleFile(nextFile: File | null) {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (result?.url) URL.revokeObjectURL(result.url);

    setFile(nextFile);
    setResult(null);
    setError("");
    setSourceUrl(nextFile ? URL.createObjectURL(nextFile) : "");
  }

  async function handleCompress() {
    if (!file) {
      setError("请先选择图片文件");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      setResult(await compressImage(file, format, quality, maxWidth));
    } catch (compressError) {
      setError(compressError instanceof Error ? compressError.message : "图片压缩失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Image Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>图片文件</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
            <option value="image/webp">WebP</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>质量 {Math.round(quality * 100)}%</span>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.01"
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大宽度 px</span>
          <input type="number" min="120" value={maxWidth} onChange={(event) => setMaxWidth(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void handleCompress()} disabled={busy}>
          {busy ? "压缩中" : "压缩图片"}
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>原始大小</h3>
          <p>{file ? formatBytes(file.size) : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>压缩后</h3>
          <p>{result ? formatBytes(result.blob.size) : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>节省</h3>
          <p>{result ? `${savedPercent}%` : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>尺寸</h3>
          <p>{result ? `${result.width} x ${result.height}` : "-"}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <article className="detail-card">
          <p className="eyebrow">Original</p>
          {sourceUrl ? <img className="media-preview" src={sourceUrl} alt="Original preview" /> : <p>等待图片</p>}
        </article>
        <article className="detail-card">
          <p className="eyebrow">Compressed</p>
          {result ? (
            <>
              <img className="media-preview" src={result.url} alt="Compressed preview" />
              <a className="button-link button-link--accent" href={result.url} download={file ? outputName(file.name, format) : `compressed.${formatExtensions[format]}`}>
                下载图片
              </a>
            </>
          ) : (
            <p>压缩后预览会显示在这里。</p>
          )}
        </article>
      </div>

      <p className="tool-note">图片只在本地 Canvas 中处理，不上传；PNG 输出会忽略质量参数。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
