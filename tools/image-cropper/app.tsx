"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    image.src = url;
  });
}

export default function ImageCropperTool({ manifest }: ToolAppProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sourceName, setSourceName] = useState("cropped-image.png");
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 512, h: 512 });
  const [outputUrl, setOutputUrl] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = Math.max(1, Math.min(crop.w, image.naturalWidth - crop.x));
    const height = Math.max(1, Math.min(crop.h, image.naturalHeight - crop.y));
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, crop.x, crop.y, width, height, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setOutputUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    }, "image/png");
  }, [crop, image]);

  async function handleFile(file: File) {
    setError("");
    setSourceName(file.name.replace(/\.[^.]+$/, "-cropped.png"));
    try {
      const loaded = await loadImage(file);
      setImage(loaded);
      const size = Math.min(loaded.naturalWidth, loaded.naturalHeight);
      setCrop({ x: Math.round((loaded.naturalWidth - size) / 2), y: Math.round((loaded.naturalHeight - size) / 2), w: size, h: size });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Image load failed");
    }
  }

  const maxX = image ? Math.max(0, image.naturalWidth - crop.w) : 0;
  const maxY = image ? Math.max(0, image.naturalHeight - crop.h) : 0;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Image crop</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Image</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} /></label><button type="button" onClick={() => image && setCrop({ x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight })} disabled={!image}>Full image</button><button type="button" onClick={() => image && setCrop({ x: Math.round((image.naturalWidth - Math.min(image.naturalWidth, image.naturalHeight)) / 2), y: Math.round((image.naturalHeight - Math.min(image.naturalWidth, image.naturalHeight)) / 2), w: Math.min(image.naturalWidth, image.naturalHeight), h: Math.min(image.naturalWidth, image.naturalHeight) })} disabled={!image}>Center square</button></div>
      <div className="detail-grid"><label className="tool-field tool-field--compact"><span>X</span><input type="number" min={0} max={maxX} value={crop.x} onChange={(event) => setCrop((current) => ({ ...current, x: Math.max(0, Math.min(maxX, Number(event.target.value))) }))} /></label><label className="tool-field tool-field--compact"><span>Y</span><input type="number" min={0} max={maxY} value={crop.y} onChange={(event) => setCrop((current) => ({ ...current, y: Math.max(0, Math.min(maxY, Number(event.target.value))) }))} /></label><label className="tool-field tool-field--compact"><span>Width</span><input type="number" min={1} value={crop.w} onChange={(event) => setCrop((current) => ({ ...current, w: Math.max(1, Number(event.target.value)) }))} /></label><label className="tool-field tool-field--compact"><span>Height</span><input type="number" min={1} value={crop.h} onChange={(event) => setCrop((current) => ({ ...current, h: Math.max(1, Number(event.target.value)) }))} /></label></div>
      <div className="workspace workspace--two-column"><div className="detail-card"><h3>Canvas preview</h3><canvas ref={canvasRef} style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border-subtle)" }} /></div><div className="detail-card"><h3>Output</h3>{outputUrl ? <><img src={outputUrl} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8 }} /><a href={outputUrl} download={sourceName}><button type="button">Download PNG</button></a></> : <p>No image selected</p>}</div></div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
