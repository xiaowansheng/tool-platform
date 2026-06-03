"use client";

import { useEffect, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ExtractedColor {
  hex: string;
  rgb: string;
  r: number;
  g: number;
  b: number;
  count: number;
  percent: number;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
    image.src = url;
  });
}

function quantize(value: number, step: number) {
  return Math.round(value / step) * step;
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function extractColors(image: HTMLImageElement, maxSize = 200, colorCount = 12) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用");

  let w = image.naturalWidth;
  let h = image.naturalHeight;
  if (w > maxSize || h > maxSize) {
    const ratio = Math.min(maxSize / w, maxSize / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const step = 24;
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    const key = `${quantize(r, step)},${quantize(g, step)},${quantize(b, step)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { r: quantize(r, step), g: quantize(g, step), b: quantize(b, step), count: 1 });
    }
  }

  const total = data.length / 4;
  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, colorCount);

  return sorted.map(({ r, g, b, count }) => ({
    hex: "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join(""),
    rgb: `rgb(${r}, ${g}, ${b})`,
    r, g, b,
    count,
    percent: Math.round((count / total) * 1000) / 10
  }));
}

export default function ColorExtractorTool({ manifest }: ToolAppProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  async function handleFile(nextFile: File | null) {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setFile(nextFile);
    setColors([]);
    setError("");
    if (!nextFile) { setSourceUrl(""); return; }
    const url = URL.createObjectURL(nextFile);
    setSourceUrl(url);
    try {
      const image = await loadImage(nextFile);
      setColors(extractColors(image));
    } catch (e) {
      setError(e instanceof Error ? e.message : "颜色提取失败");
    }
  }

  async function copyColor(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
    } catch {
      setCopied("");
    }
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>图片文件</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
        </label>
      </div>

      {!file && (
        <div className="empty-state">
          <strong>等待图片</strong>
          <p>选择一张图片后自动提取主色和配色方案。</p>
        </div>
      )}

      {file && sourceUrl && (
        <div className="workspace workspace--two-column">
          <article className="detail-card">
            <p className="eyebrow">原图预览</p>
            <img className="media-preview"
              src={sourceUrl}
              alt="预览"
              style={{ maxHeight: 320, objectFit: "contain" }} />
          </article>
          <div>
            <p className="eyebrow">提取的颜色（{colors.length}）</p>
            <div className="palette-grid">
              {colors.map((c) => {
                const textColor = luminance(c.r, c.g, c.b) > 0.55 ? "#111" : "#fff";
                return (
                  <button key={c.hex} type="button"
                    style={{
                      background: c.hex,
                      color: textColor,
                      border: "1px solid rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      width: "100%",
                      padding: "14px 8px",
                      borderRadius: 6,
                      textAlign: "center",
                      fontFamily: "inherit",
                      lineHeight: 1.5
                    }}
                    onClick={() => void copyColor(c.hex)}>
                    <strong style={{ display: "block", fontSize: 14 }}>
                      {copied === c.hex ? "已复制" : c.hex}
                    </strong>
                    <span style={{ display: "block", fontSize: 11, opacity: 0.8 }}>{c.rgb}</span>
                    <span style={{ display: "block", fontSize: 11, opacity: 0.8 }}>{c.percent}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="tool-note">图片仅在你的浏览器中处理，不会被上传到服务器。点击色块即可复制 HEX 值。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
