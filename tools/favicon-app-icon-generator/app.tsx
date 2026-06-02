"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type IconShape = "rounded" | "circle" | "square";

const iconSizes = [16, 32, 48, 180, 192, 512];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizeHexColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function buildIconSvg(label: string, background: string, foreground: string, shape: IconShape, size: number) {
  const radius = shape === "circle" ? size / 2 : shape === "rounded" ? Math.round(size * 0.22) : 0;
  const fontSize = Math.round(size * (label.length > 2 ? 0.34 : 0.42));
  const safeLabel = escapeXml(label.slice(0, 4).toUpperCase());

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${foreground}">${safeLabel}</text>
</svg>`;
}

function buildHtmlSnippet(pathPrefix: string) {
  const prefix = pathPrefix.trim().replace(/\/+$/, "");

  return [
    `<link rel="icon" type="image/png" sizes="32x32" href="${prefix}/favicon-32x32.png">`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${prefix}/favicon-16x16.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${prefix}/apple-touch-icon.png">`,
    `<link rel="manifest" href="${prefix}/site.webmanifest">`,
    `<meta name="theme-color" content="#0d1824">`
  ].join("\n");
}

export default function FaviconAppIconGeneratorTool({ manifest }: ToolAppProps) {
  const [label, setLabel] = useState("TP");
  const [background, setBackground] = useState("#0f766e");
  const [foreground, setForeground] = useState("#e8eff7");
  const [shape, setShape] = useState<IconShape>("rounded");
  const [size, setSize] = useState(512);
  const [pathPrefix, setPathPrefix] = useState("/icons");
  const [copied, setCopied] = useState("");

  const svg = useMemo(() => buildIconSvg(label || "A", background, foreground, shape, size), [background, foreground, label, shape, size]);
  const htmlSnippet = useMemo(() => buildHtmlSnippet(pathPrefix), [pathPrefix]);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
  }

  function downloadSvg() {
    const anchor = document.createElement("a");
    anchor.href = svgDataUrl(svg);
    anchor.download = `icon-${size}.svg`;
    anchor.click();
  }

  function downloadPng(targetSize: number) {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.drawImage(image, 0, 0, targetSize, targetSize);
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = targetSize === 180 ? "apple-touch-icon.png" : `favicon-${targetSize}x${targetSize}.png`;
        anchor.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.src = svgDataUrl(svg);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图标工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>文字</span>
          <input value={label} maxLength={4} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>形状</span>
          <select value={shape} onChange={(event) => setShape(event.target.value as IconShape)}>
            <option value="rounded">圆角</option>
            <option value="circle">圆形</option>
            <option value="square">方形</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景色</span>
          <input value={background} onChange={(event) => setBackground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景取色</span>
          <input type="color" value={normalizeHexColor(background, "#0f766e")} onChange={(event) => setBackground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>前景色</span>
          <input value={foreground} onChange={(event) => setForeground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>前景取色</span>
          <input type="color" value={normalizeHexColor(foreground, "#e8eff7")} onChange={(event) => setForeground(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>预览尺寸</span>
          <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
            {iconSizes.map((item) => (
              <option key={item} value={item}>{item} x {item}</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>公共路径</span>
          <input value={pathPrefix} onChange={(event) => setPathPrefix(event.target.value)} />
        </label>
      </div>

      <div className="asset-preview-grid">
        <article className="detail-card favicon-stage">
          <img src={svgDataUrl(svg)} alt="生成的应用图标" />
          <p>{size} x {size} SVG 源图，可导出为 PNG。</p>
        </article>
        <article className="detail-card">
          <h3>导出</h3>
          <div className="tool-option-list">
            {iconSizes.map((item) => (
              <button key={item} type="button" onClick={() => downloadPng(item)}>{item}px PNG</button>
            ))}
            <button type="button" onClick={downloadSvg}>SVG</button>
          </div>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SVG</span>
          <textarea value={svg} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>HTML 标签</span>
          <textarea value={htmlSnippet} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="tool-option-list">
        <button type="button" onClick={() => void copy(svg, "svg")}>{copied === "svg" ? "已复制 SVG" : "复制 SVG"}</button>
        <button type="button" onClick={() => void copy(htmlSnippet, "html")}>{copied === "html" ? "已复制 HTML" : "复制 HTML"}</button>
      </div>
    </section>
  );
}
