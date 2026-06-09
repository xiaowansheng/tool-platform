"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface PaletteColor {
  hex: string;
  rgb: string;
  hsl: string;
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return "hsl(" + Math.round(h * 360) + " " + Math.round(s * 100) + "% " + Math.round(l * 100) + "%)";
}

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    image.src = url;
  });
}

async function extractPalette(file: File): Promise<PaletteColor[]> {
  const image = await readImage(file);
  const canvas = document.createElement("canvas");
  const maxSide = 180;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3] ?? 0;
    if (alpha < 120) continue;
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const key = [r, g, b].map((value) => Math.round(value / 32) * 32).join("-");
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count).slice(0, 10).map((bucket) => {
    const r = Math.round(bucket.r / bucket.count);
    const g = Math.round(bucket.g / bucket.count);
    const b = Math.round(bucket.b / bucket.count);
    return { hex: rgbToHex(r, g, b), rgb: "rgb(" + r + ", " + g + ", " + b + ")", hsl: rgbToHsl(r, g, b) };
  });
}

export default function ColorPaletteExtractorTool({ manifest }: ToolAppProps) {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [colors, setColors] = useState<PaletteColor[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const cssVars = useMemo(() => colors.map((color, index) => "--palette-" + (index + 1) + ": " + color.hex + ";").join("\n"), [colors]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setCopied(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      setColors(await extractPalette(file));
    } catch (paletteError) {
      setError(paletteError instanceof Error ? paletteError.message : "Failed to extract palette");
      setColors([]);
    }
  }

  async function copyCss() {
    await navigator.clipboard.writeText(cssVars);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Image color</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Image file</span><input type="file" accept="image/*" onChange={(event) => void handleFile(event)} /></label><button type="button" onClick={() => void copyCss()} disabled={!cssVars}>{copied ? "Copied CSS" : "Copy CSS vars"}</button></div>
      <div className="workspace workspace--two-column"><div className="detail-card"><h3>{fileName || "Preview"}</h3>{previewUrl ? <img src={previewUrl} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8 }} /> : <p>No image selected</p>}</div><label className="tool-field"><span>CSS variables</span><textarea value={cssVars} readOnly spellCheck={false} /></label></div>
      <div className="detail-grid">{colors.map((color) => <article className="detail-card" key={color.hex}><div style={{ height: 56, borderRadius: 8, background: color.hex, border: "1px solid var(--border-subtle)" }} /><h3>{color.hex}</h3><p>{color.rgb}</p><p>{color.hsl}</p></article>)}</div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
