"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const demoImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420">
  <rect width="900" height="420" fill="#f4f6f8"/>
  <rect x="70" y="60" width="760" height="300" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
  <text x="120" y="150" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#233044">Invoice OCR</text>
  <text x="120" y="220" font-family="Arial, sans-serif" font-size="34" fill="#405168">Total: $1,284.50</text>
  <text x="120" y="285" font-family="Arial, sans-serif" font-size="28" fill="#64748b">Due date: 2026-06-30</text>
  <line x1="120" y1="315" x2="760" y2="315" stroke="#94a3b8" stroke-width="3"/>
</svg>`;

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

function applyFilters(imageData: ImageData, options: {
  grayscale: boolean;
  threshold: number;
  contrast: number;
  invert: boolean;
}) {
  const data = imageData.data;
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));

  for (let index = 0; index < data.length; index += 4) {
    let red = data[index] ?? 0;
    let green = data[index + 1] ?? 0;
    let blue = data[index + 2] ?? 0;

    red = clamp(contrastFactor * (red - 128) + 128);
    green = clamp(contrastFactor * (green - 128) + 128);
    blue = clamp(contrastFactor * (blue - 128) + 128);

    if (options.grayscale || options.threshold > 0) {
      const gray = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
      red = gray;
      green = gray;
      blue = gray;
    }

    if (options.threshold > 0) {
      const binary = red >= options.threshold ? 255 : 0;
      red = binary;
      green = binary;
      blue = binary;
    }

    if (options.invert) {
      red = 255 - red;
      green = 255 - green;
      blue = 255 - blue;
    }

    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }

  return imageData;
}

function formatPixels(width: number, height: number) {
  return width && height ? `${width} x ${height}` : "-";
}

export default function ImageOcrPreprocessorTool({ manifest }: ToolClientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceUrlRef = useRef("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fileName, setFileName] = useState("demo-ocr.svg");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [grayscale, setGrayscale] = useState(true);
  const [threshold, setThreshold] = useState(165);
  const [contrast, setContrast] = useState(45);
  const [invert, setInvert] = useState(false);
  const [error, setError] = useState("");

  const targetDimensions = useMemo(() => ({
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale))
  }), [dimensions.height, dimensions.width, scale]);

  useEffect(() => {
    loadDemo();

    return () => {
      if (sourceUrlRef.current) {
        URL.revokeObjectURL(sourceUrlRef.current);
      }
    };
    // The demo should only be created once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    renderProcessedImage();
  }, [sourceUrl, grayscale, threshold, contrast, invert, scale]);

  function setObjectUrl(url: string, nextFileName: string) {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
    }

    sourceUrlRef.current = url;
    setSourceUrl(url);
    setFileName(nextFileName);
    setError("");
  }

  function loadDemo() {
    const blob = new Blob([demoImageSvg], { type: "image/svg+xml" });
    setObjectUrl(URL.createObjectURL(blob), "demo-ocr.svg");
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      return;
    }

    setObjectUrl(URL.createObjectURL(file), file.name);
  }

  function renderProcessedImage() {
    if (!sourceUrl || !canvasRef.current) {
      return;
    }

    const image = new Image();

    image.onload = () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        setError("浏览器无法创建 canvas context。");
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      try {
        const imageData = context.getImageData(0, 0, width, height);
        context.putImageData(applyFilters(imageData, { grayscale, threshold, contrast, invert }), 0, 0);
        setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
        setError("");
      } catch (canvasError) {
        setError(canvasError instanceof Error ? canvasError.message : "图片处理失败");
      }
    };

    image.onerror = () => setError("图片加载失败。");
    image.src = sourceUrl;
    imageRef.current = image;
  }

  function downloadPng() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const anchor = document.createElement("a");
    const baseName = fileName.replace(/\.[^.]+$/, "") || "ocr-preprocessed";

    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `${baseName}-ocr.png`;
    anchor.click();
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图片工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>图片</span>
          <input type="file" accept="image/*" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
        </label>
        <button type="button" onClick={loadDemo}>加载示例</button>
        <button type="button" onClick={downloadPng} disabled={!sourceUrl}>下载 PNG</button>
        <label className="tool-check">
          <input type="checkbox" checked={grayscale} onChange={(event) => setGrayscale(event.target.checked)} />
          Grayscale
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={invert} onChange={(event) => setInvert(event.target.checked)} />
          Invert
        </label>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>阈值 {threshold}</span>
          <input type="range" min="0" max="255" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>对比度 {contrast}</span>
          <input type="range" min="-100" max="100" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>缩放 {scale.toFixed(1)}x</span>
          <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Source</h3>
          <p>{formatPixels(dimensions.width, dimensions.height)}</p>
        </article>
        <article className="detail-card">
          <h3>Output</h3>
          <p>{formatPixels(targetDimensions.width, targetDimensions.height)}</p>
        </article>
        <article className="detail-card">
          <h3>File</h3>
          <p>{fileName}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="visual-preview code-preview">
          {sourceUrl ? <img src={sourceUrl} alt="source preview" style={{ maxWidth: "100%", maxHeight: "22rem" }} /> : null}
        </div>
        <div className="visual-preview code-preview">
          <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "22rem" }} />
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">阈值为 0 时仅做灰度/对比度处理；文档照片通常可先提高对比度，再尝试 130-190 的二值化阈值。</p>
    </section>
  );
}
