"use client";

import { useEffect, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type OutputFormat = "image/png" | "image/jpeg" | "image/webp" | "image/bmp";

const formats: { value: OutputFormat; label: string; ext: string }[] = [
  { value: "image/png", label: "PNG（无损）", ext: "png" },
  { value: "image/jpeg", label: "JPEG", ext: "jpg" },
  { value: "image/webp", label: "WebP", ext: "webp" },
  { value: "image/bmp", label: "BMP", ext: "bmp" }
];

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
    img.src = url;
  });
}

export default function ImageFormatConverterTool({ manifest }: ToolAppProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(100);
  const [result, setResult] = useState<{ url: string; size: number; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  function handleFile(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(nextFile);
    setResult(null);
    setError("");
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
  }

  async function handleConvert() {
    if (!file) { setError("请先选择图片"); return; }
    setBusy(true); setError("");
    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      const img = await loadImage(file);
      const w = Math.round(img.naturalWidth * scale / 100);
      const h = Math.round(img.naturalHeight * scale / 100);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("导出失败")), format, format === "image/png" || format === "image/bmp" ? undefined : quality);
      });
      setResult({ url: URL.createObjectURL(blob), size: blob.size, width: w, height: h });
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败");
    } finally { setBusy(false); }
  }

  const fmt = formats.find((f) => f.value === format)!;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">图像转换</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>图片文件</span>
          <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            {formats.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        {format !== "image/png" && format !== "image/bmp" ? (
          <label className="tool-field tool-field--compact">
            <span>质量 {Math.round(quality * 100)}%</span>
            <input type="range" min="0.1" max="1" step="0.01" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
          </label>
        ) : null}
        <label className="tool-field tool-field--compact">
          <span>缩放 {scale}%</span>
          <input type="range" min="10" max="200" step="5" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        </label>
        <button type="button" onClick={() => void handleConvert()} disabled={busy}>{busy ? "转换中…" : "转换"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>原始大小</h3><p>{file ? formatBytes(file.size) : "-"}</p></article>
        <article className="detail-card"><h3>转换后</h3><p>{result ? formatBytes(result.size) : "-"}</p></article>
        <article className="detail-card"><h3>输出尺寸</h3><p>{result ? `${result.width} × ${result.height}` : "-"}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <article className="detail-card">
          <p className="eyebrow">原图</p>
          {previewUrl ? <img className="media-preview" src={previewUrl} alt="原图" /> : <p>等待图片</p>}
        </article>
        <article className="detail-card">
          <p className="eyebrow">转换结果</p>
          {result ? (
            <>
              <img className="media-preview" src={result.url} alt="转换结果" />
              <a className="button-link button-link--accent" href={result.url} download={file ? `${file.name.replace(/\.[^.]+$/, "")}.${fmt.ext}` : `converted.${fmt.ext}`}>下载</a>
            </>
          ) : <p>转换后预览会显示在这里。</p>}
        </article>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">图片在浏览器本地 Canvas 中处理，不上传。BMP 格式依赖浏览器原生支持，部分浏览器可能不可用。</p>
    </section>
  );
}
