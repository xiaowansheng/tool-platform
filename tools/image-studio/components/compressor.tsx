"use client";

import { useEffect, useMemo, useState } from "react";

interface CompressorProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

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

export default function ImageCompressorTab({ activeFile, onChangeFile }: CompressorProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(0.78);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const savedPercent = useMemo(() => {
    if (!activeFile || !result) return 0;
    return Math.max(0, Math.round((1 - result.blob.size / activeFile.size) * 100));
  }, [activeFile, result]);

  useEffect(() => {
    if (!activeFile) {
      setSourceUrl("");
      setResult(null);
      return;
    }
    setError("");
    const url = URL.createObjectURL(activeFile);
    setSourceUrl(url);
    setResult(null);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result?.url]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onChangeFile(file);
    }
  }

  async function handleCompress() {
    if (!activeFile) {
      setError("请先选择图片文件");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      setResult(await compressImage(activeFile, format, quality, maxWidth));
    } catch (compressError) {
      setError(compressError instanceof Error ? compressError.message : "图片压缩失败");
    } finally {
      setBusy(false);
    }
  }

  function handleSetAsActive() {
    if (result && activeFile) {
      const cleanFile = new File([result.blob], outputName(activeFile.name, format), { type: format });
      onChangeFile(cleanFile);
      setResult(null);
    }
  }

  return (
    <div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>选择图片</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
          />
        </label>
        {activeFile && (
          <>
            <label className="tool-field tool-field--compact">
              <span>输出格式</span>
              <select value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </label>
            <label className="tool-field tool-field--compact">
              <span>压缩质量 {Math.round(quality * 100)}%</span>
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
              {busy ? "压缩中" : "开始压缩"}
            </button>
          </>
        )}
      </div>

      {activeFile && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", margin: "20px 0" }}>
          <article className="detail-card">
            <h3>原始大小</h3>
            <p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{formatBytes(activeFile.size)}</p>
          </article>
          <article className="detail-card">
            <h3>压缩后</h3>
            <p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{result ? formatBytes(result.blob.size) : "-"}</p>
          </article>
          <article className="detail-card">
            <h3>大小节省</h3>
            <p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{result ? `${savedPercent}%` : "-"}</p>
          </article>
          <article className="detail-card">
            <h3>输出尺寸</h3>
            <p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{result ? `${result.width} x ${result.height}` : "-"}</p>
          </article>
        </div>
      )}

      {activeFile ? (
        <div className="workspace workspace--two-column" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>原图</p>
            {sourceUrl ? <img className="media-preview" src={sourceUrl} alt="原图预览" style={{ maxHeight: "320px", objectFit: "contain", borderRadius: "var(--radius-md)" }} /> : <p>等待图片</p>}
          </article>
          <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>压缩效果</p>
            {result ? (
              <>
                <img className="media-preview" src={result.url} alt="压缩图预览" style={{ maxHeight: "250px", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
                <div className="tool-toolbar" style={{ gap: "12px", width: "100%", justifyContent: "center", marginBottom: 0 }}>
                  <a className="button-link button-link--accent" href={result.url} download={activeFile ? outputName(activeFile.name, format) : `compressed.${formatExtensions[format]}`} style={{ margin: 0 }}>
                    下载压缩图片
                  </a>
                  <button type="button" onClick={handleSetAsActive} style={{ margin: 0 }}>设为工坊当前图片</button>
                </div>
              </>
            ) : (
              <p className="tool-note" style={{ margin: 0 }}>点击上方的“开始压缩”按钮即可预览结果。</p>
            )}
          </article>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: "40px 20px", border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", textAlign: "center", marginTop: "20px" }}>
          <strong>等待图片上传</strong>
          <p className="tool-note" style={{ margin: "8px 0 0 0" }}>选择一张本地图片，可以配置 WebP/JPEG 输出格式，调整品质比例并缩放最大宽度进行本地无损/有损压缩。</p>
        </div>
      )}

      <p className="tool-note" style={{ marginTop: "20px" }}>图片只在本地 Canvas 中处理，不上传；PNG 输出会忽略质量参数。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </div>
  );
}
