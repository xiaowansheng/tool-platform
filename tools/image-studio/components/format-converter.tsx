"use client";

import { useEffect, useState } from "react";

interface ConverterProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

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

export default function ImageFormatConverterTab({ activeFile, onChangeFile }: ConverterProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(100);
  const [result, setResult] = useState<{ blob: Blob; url: string; size: number; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeFile) {
      setPreviewUrl("");
      setResult(null);
      return;
    }
    setError("");
    const url = URL.createObjectURL(activeFile);
    setPreviewUrl(url);
    setResult(null);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onChangeFile(file);
    }
  }

  async function handleConvert() {
    if (!activeFile) { setError("请先选择图片"); return; }
    setBusy(true); setError("");
    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      const img = await loadImage(activeFile);
      const w = Math.round((img.naturalWidth * scale) / 100);
      const h = Math.round((img.naturalHeight * scale) / 100);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("导出失败")), format, format === "image/png" || format === "image/bmp" ? undefined : quality);
      });
      setResult({ blob, url: URL.createObjectURL(blob), size: blob.size, width: w, height: h });
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败");
    } finally { setBusy(false); }
  }

  const fmt = formats.find((f) => f.value === format)!;

  function handleSetAsActive() {
    if (result && activeFile) {
      const cleanFile = new File([result.blob], `${activeFile.name.replace(/\.[^.]+$/, "")}.${fmt.ext}`, { type: format });
      onChangeFile(cleanFile);
      setResult(null);
    }
  }

  return (
    <div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>选择图片</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
        {activeFile && (
          <>
            <label className="tool-field tool-field--compact">
              <span>输出格式</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
                {formats.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            {format !== "image/png" && format !== "image/bmp" ? (
              <label className="tool-field tool-field--compact">
                <span>画面质量 {Math.round(quality * 100)}%</span>
                <input type="range" min="0.1" max="1" step="0.01" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
              </label>
            ) : null}
            <label className="tool-field tool-field--compact">
              <span>尺寸缩放 {scale}%</span>
              <input type="range" min="10" max="200" step="5" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
            </label>
            <button type="button" onClick={() => void handleConvert()} disabled={busy}>{busy ? "转换中…" : "执行转换"}</button>
          </>
        )}
      </div>

      {activeFile && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", margin: "20px 0" }}>
          <article className="detail-card"><h3>原始大小</h3><p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{formatBytes(activeFile.size)}</p></article>
          <article className="detail-card"><h3>转换后</h3><p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{result ? formatBytes(result.size) : "-"}</p></article>
          <article className="detail-card"><h3>输出尺寸</h3><p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{result ? `${result.width} × ${result.height}` : "-"}</p></article>
        </div>
      )}

      {activeFile ? (
        <div className="workspace workspace--two-column" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>原图</p>
            {previewUrl ? <img className="media-preview" src={previewUrl} alt="原图" style={{ maxHeight: "320px", objectFit: "contain", borderRadius: "var(--radius-md)" }} /> : <p>等待图片</p>}
          </article>
          <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>转换结果</p>
            {result ? (
              <>
                <img className="media-preview" src={result.url} alt="转换结果" style={{ maxHeight: "250px", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
                <div className="tool-toolbar" style={{ gap: "12px", width: "100%", justifyContent: "center", marginBottom: 0 }}>
                  <a className="button-link button-link--accent" href={result.url} download={activeFile ? `${activeFile.name.replace(/\.[^.]+$/, "")}.${fmt.ext}` : `converted.${fmt.ext}`} style={{ margin: 0 }}>下载图片</a>
                  <button type="button" onClick={handleSetAsActive} style={{ margin: 0 }}>设为工坊当前图片</button>
                </div>
              </>
            ) : <p className="tool-note" style={{ margin: 0 }}>点击上方的“执行转换”开始运行。</p>}
          </article>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: "40px 20px", border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", textAlign: "center", marginTop: "20px" }}>
          <strong>等待图片上传</strong>
          <p className="tool-note" style={{ margin: "8px 0 0 0" }}>选择一张本地图片，可以方便地在 WebP、PNG、JPEG、BMP 格式间进行相互转换与调整导出比例。</p>
        </div>
      )}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "20px" }}>图片在浏览器本地 Canvas 中处理，不上传。BMP 格式依赖浏览器原生支持，部分浏览器可能不可用。</p>
    </div>
  );
}
