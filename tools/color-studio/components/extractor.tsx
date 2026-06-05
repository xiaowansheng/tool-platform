"use client";

import { useEffect, useState } from "react";
import { swatchTextColor } from "../utils/color";

interface ExtractorProps {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

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

export default function ColorExtractorTab({ activeColor, onChangeColor }: ExtractorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [colorCount, setColorCount] = useState(12);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  // Extract colors reactively when image or count changes
  useEffect(() => {
    if (!imageElement) {
      setColors([]);
      return;
    }
    try {
      setColors(extractColors(imageElement, 200, colorCount));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "颜色提取失败");
    }
  }, [imageElement, colorCount]);

  async function handleFile(nextFile: File | null) {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setFile(nextFile);
    setImageElement(null);
    setError("");
    if (!nextFile) { setSourceUrl(""); return; }
    const url = URL.createObjectURL(nextFile);
    setSourceUrl(url);
    try {
      const image = await loadImage(nextFile);
      setImageElement(image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "颜色提取失败");
    }
  }

  async function copyColor(hexVal: string) {
    try {
      await navigator.clipboard.writeText(hexVal);
      setCopied(hexVal);
      onChangeColor(hexVal);
    } catch {
      setCopied("");
    }
    setTimeout(() => setCopied(""), 2000);
  }

  async function copyAllColors() {
    const css = colors.map((c) => `${c.hex}  /* ${c.rgb} — ${c.percent}% */`).join("\n");
    try {
      await navigator.clipboard.writeText(css);
      setCopiedAll(true);
    } catch {
      setCopiedAll(false);
    } finally {
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }

  return (
    <div>
      <div className="tool-toolbar" style={{ marginBottom: "20px" }}>
        <label className="tool-field tool-field--compact">
          <span>图片文件</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>提取数量</span>
            <span style={{ fontFamily: "monospace", opacity: 0.85 }}>{colorCount}</span>
          </span>
          <input type="range" min={3} max={24} value={colorCount} onChange={(e) => setColorCount(Number(e.target.value))} />
        </label>
      </div>

      {!file && (
        <div className="empty-state" style={{ padding: "48px 20px", border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎨</div>
          <strong style={{ display: "block", fontSize: "1.05rem" }}>等待图片上传</strong>
          <p className="tool-note" style={{ margin: "8px 0 0 0" }}>选择一张本地图片（PNG、JPG、WebP、GIF），自动提取其中的主色和配色方案。</p>
        </div>
      )}

      {file && sourceUrl && (
        <div className="workspace workspace--two-column" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>原图预览</p>
            <img className="media-preview"
              src={sourceUrl}
              alt="预览"
              style={{ maxHeight: 320, objectFit: "contain", borderRadius: "var(--radius-md)", width: "100%" }} />
          </article>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 12px 0" }}>
              <p className="eyebrow" style={{ margin: 0 }}>提取的颜色（{colors.length}）</p>
              {colors.length > 0 && (
                <button type="button" onClick={() => void copyAllColors()} style={{ fontSize: "0.8rem" }}>
                  {copiedAll ? "已复制全部" : "复制全部"}
                </button>
              )}
            </div>
            <div className="palette-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
              {colors.map((c) => {
                const textColorVal = swatchTextColor({ r: c.r, g: c.g, b: c.b });
                const isSelected = activeColor === c.hex;
                return (
                  <button key={c.hex} type="button"
                    style={{
                      background: c.hex,
                      color: textColorVal,
                      border: isSelected ? "3px solid var(--text-primary)" : "1px solid rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      width: "100%",
                      padding: "14px 8px",
                      borderRadius: "var(--radius-md)",
                      textAlign: "center",
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                      boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
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

      <p className="tool-note" style={{ marginTop: "20px" }}>图片仅在你的浏览器中处理，不会被上传到服务器。点击色块即可将其设为全局颜色并复制 HEX 值。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </div>
  );
}
