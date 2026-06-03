"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

interface ImageSpec {
  name: string;
  type: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: string;
  megapixels: number;
  printSizeAt300: { w: number; h: number };
  printSizeAt72: { w: number; h: number };
}

export default function ImageSpecViewerTool({ manifest }: ToolAppProps) {
  const [spec, setSpec] = useState<ImageSpec | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dpi, setDpi] = useState(300);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function handleFile(file: File) {
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const g = gcd(w, h);

      setSpec({
        name: file.name,
        type: file.type,
        fileSize: file.size,
        width: w,
        height: h,
        aspectRatio: `${w / g}:${h / g}`,
        megapixels: (w * h) / 1_000_000,
        printSizeAt300: { w: w / 300 * 25.4, h: h / 300 * 25.4 },
        printSizeAt72: { w: w / 72 * 25.4, h: h / 72 * 25.4 }
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); setError("图片读取失败"); };
    img.src = url;
  }

  async function handleCopy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  // Calculate print size at custom DPI
  const customPrint = spec ? {
    w: (spec.width / dpi * 25.4).toFixed(1),
    h: (spec.height / dpi * 25.4).toFixed(1)
  } : null;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">图片信息</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>图片文件</span>
          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>自定义 DPI</span>
          <input type="number" min="1" max="2400" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
        </label>
      </div>

      {previewUrl ? (
        <article className="detail-card">
          <p className="eyebrow">预览</p>
          <img className="media-preview" src={previewUrl} alt="图片预览" />
        </article>
      ) : null}

      {spec ? (
        <div className="case-grid">
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">尺寸</p><h3>像素</h3></div>
              <button type="button" onClick={() => void handleCopy("px", `${spec.width} × ${spec.height}`)}>
                {copied === "px" ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mono-output">{spec.width} × {spec.height}</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">比例</p><h3>宽高比</h3></div>
            </div>
            <p className="mono-output">{spec.aspectRatio}</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">文件大小</p><h3>存储</h3></div>
            </div>
            <p className="mono-output">{formatBytes(spec.fileSize)}</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">MIME</p><h3>格式</h3></div>
            </div>
            <p className="mono-output">{spec.type}</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">像素总量</p><h3>MP</h3></div>
            </div>
            <p className="mono-output">{spec.megapixels.toFixed(2)} MP</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">300 DPI 打印</p><h3>高品质</h3></div>
              <button type="button" onClick={() => void handleCopy("300", `${spec.printSizeAt300.w.toFixed(1)} × ${spec.printSizeAt300.h.toFixed(1)} mm`)}>
                {copied === "300" ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mono-output">{spec.printSizeAt300.w.toFixed(1)} × {spec.printSizeAt300.h.toFixed(1)} mm</p>
            <p className="mono-output" style={{ fontSize: "0.8em" }}>{(spec.printSizeAt300.w / 25.4).toFixed(1)} × {(spec.printSizeAt300.h / 25.4).toFixed(1)} in</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">72 DPI 打印</p><h3>屏幕</h3></div>
            </div>
            <p className="mono-output">{spec.printSizeAt72.w.toFixed(1)} × {spec.printSizeAt72.h.toFixed(1)} mm</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div><p className="eyebrow">{dpi} DPI</p><h3>自定义</h3></div>
              <button type="button" onClick={() => void handleCopy("custom", customPrint ? `${customPrint.w} × ${customPrint.h} mm` : "")}>
                {copied === "custom" ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mono-output">{customPrint?.w} × {customPrint?.h} mm</p>
          </article>
        </div>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">打印尺寸计算公式：mm = px ÷ DPI × 25.4。所有信息在浏览器本地提取，图片不上传。</p>
    </section>
  );
}
