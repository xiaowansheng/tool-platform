"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CropperProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

interface CropArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

const presets: { label: string; ratio: number | null }[] = [
  { label: "自由", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "2:1", ratio: 2 },
  { label: "3:2", ratio: 3 / 2 }
];

export default function ImageCropperTab({ activeFile, onChangeFile }: CropperProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, w: 100, h: 100 });
  const [presetIdx, setPresetIdx] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; url: string; w: number; h: number } | null>(null);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!activeFile) {
      setImageUrl("");
      setImgSize({ w: 0, h: 0 });
      setResult(null);
      return;
    }

    setError("");
    const img = new Image();
    const url = URL.createObjectURL(activeFile);
    img.onload = () => {
      imgRef.current = img;
      setImageUrl(url);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setCrop({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
      setPresetIdx(0); // Reset to Free crop
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("图片加载失败");
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize.w) return;

    const ctx = canvas.getContext("2d")!;
    const displayW = canvas.width;
    const displayH = canvas.height;
    const scaleX = displayW / img.naturalWidth;
    const scaleY = displayH / img.naturalHeight;

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, 0, 0, displayW, displayH);

    // Draw overlay
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, displayW, displayH);

    // Clear crop area
    const cx = crop.x * scaleX;
    const cy = crop.y * scaleY;
    const cw = crop.w * scaleX;
    const ch = crop.h * scaleY;
    ctx.clearRect(cx, cy, cw, ch);
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, cx, cy, cw, ch);

    // Draw border
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + (cw / 3) * i, cy);
      ctx.lineTo(cx + (cw / 3) * i, cy + ch);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(cx, cy + (ch / 3) * i);
      ctx.lineTo(cx + cw, cy + (ch / 3) * i);
      ctx.stroke();
    }
  }, [crop, imgSize]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onChangeFile(file);
    }
  }

  function getCanvasPos(e: React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imgSize.w / rect.width;
    const scaleY = imgSize.h / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!imgRef.current) return;
    dragging.current = true;
    const pos = getCanvasPos(e);
    dragStart.current = { x: pos.x - crop.x, y: pos.y - crop.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !imgRef.current) return;
    const pos = getCanvasPos(e);
    let newX = Math.max(0, Math.min(pos.x - dragStart.current.x, imgSize.w - crop.w));
    let newY = Math.max(0, Math.min(pos.y - dragStart.current.y, imgSize.h - crop.h));
    setCrop((prev) => ({ ...prev, x: Math.round(newX), y: Math.round(newY) }));
  }

  function handleMouseUp() { dragging.current = false; }

  function applyPreset(idx: number) {
    setPresetIdx(idx);
    const ratio = presets[idx]!.ratio;
    if (!ratio || !imgSize.w) return;

    let w = imgSize.w;
    let h = imgSize.w / ratio;
    if (h > imgSize.h) { h = imgSize.h; w = imgSize.h * ratio; }
    w = Math.round(w); h = Math.round(h);
    const x = Math.round((imgSize.w - w) / 2);
    const y = Math.round((imgSize.h - h) / 2);
    setCrop({ x, y, w, h });
  }

  function handleCrop() {
    if (!imgRef.current) { setError("请先上传图片"); return; }
    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      const canvas = document.createElement("canvas");
      canvas.width = crop.w; canvas.height = crop.h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imgRef.current, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      canvas.toBlob((blob) => {
        if (blob) {
          setResult({ blob, url: URL.createObjectURL(blob), w: crop.w, h: crop.h });
        } else {
          setError("导出失败");
        }
      }, "image/png");
    } catch { setError("裁剪失败"); }
  }

  function handleSetAsActive() {
    if (result && activeFile) {
      const cleanFile = new File([result.blob], `cropped-${activeFile.name}`, { type: "image/png" });
      onChangeFile(cleanFile);
      setResult(null);
    }
  }

  const displayW = Math.min(600, imgSize.w || 600);
  const displayH = imgSize.w ? Math.round(displayW * imgSize.h / imgSize.w) : 400;

  return (
    <div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>选择图片</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
        {imageUrl && (
          <label className="tool-field tool-field--compact">
            <span>比例预设</span>
            <select value={presetIdx} onChange={(e) => applyPreset(Number(e.target.value))}>
              {presets.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {imageUrl ? (
        <>
          <div className="tool-toolbar tool-toolbar--grid" style={{ marginTop: "10px" }}>
            <label className="tool-field tool-field--compact">
              <span>X 轴位移: {crop.x}px</span>
              <input type="range" min="0" max={imgSize.w - crop.w} value={crop.x} onChange={(e) => setCrop((p) => ({ ...p, x: Number(e.target.value) }))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Y 轴位移: {crop.y}px</span>
              <input type="range" min="0" max={imgSize.h - crop.h} value={crop.y} onChange={(e) => setCrop((p) => ({ ...p, y: Number(e.target.value) }))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>裁剪宽度: {crop.w}px</span>
              <input type="range" min="10" max={imgSize.w} value={crop.w} onChange={(e) => setCrop((p) => {
                const newW = Number(e.target.value);
                const maxH = imgSize.h;
                let newH = p.h;
                const ratio = presets[presetIdx]!.ratio;
                if (ratio) {
                  newH = Math.min(maxH, Math.round(newW / ratio));
                }
                return {
                  ...p,
                  w: newW,
                  h: newH,
                  x: Math.min(p.x, imgSize.w - newW),
                  y: Math.min(p.y, imgSize.h - newH)
                };
              })} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>裁剪高度: {crop.h}px</span>
              <input type="range" min="10" max={imgSize.h} value={crop.h} onChange={(e) => setCrop((p) => {
                const newH = Number(e.target.value);
                const maxW = imgSize.w;
                let newW = p.w;
                const ratio = presets[presetIdx]!.ratio;
                if (ratio) {
                  newW = Math.min(maxW, Math.round(newH * ratio));
                }
                return {
                  ...p,
                  h: newH,
                  w: newW,
                  x: Math.min(p.x, imgSize.w - newW),
                  y: Math.min(p.y, imgSize.h - newH)
                };
              })} />
            </label>
          </div>

          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <canvas
              ref={canvasRef}
              width={displayW}
              height={displayH}
              style={{ cursor: "move", maxWidth: "100%", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="tool-toolbar" style={{ justifyContent: "center" }}>
            <button type="button" className="button--primary" onClick={handleCrop}>确认裁剪</button>
          </div>
        </>
      ) : (
        <div className="empty-state" style={{ padding: "40px 20px", border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", textAlign: "center", marginTop: "20px" }}>
          <strong>等待图片上传</strong>
          <p className="tool-note" style={{ margin: "8px 0 0 0" }}>选择一张本地图片即可在网格画布中自由拖拽框选或设置常见比例（1:1、16:9等）进行裁剪。</p>
        </div>
      )}

      {result ? (
        <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", marginTop: "20px" }}>
          <p className="eyebrow" style={{ alignSelf: "flex-start", margin: 0 }}>裁剪结果 ({result.w} × {result.h} 像素)</p>
          <img className="media-preview" src={result.url} alt="裁剪结果" style={{ maxHeight: "280px", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
          <div className="tool-toolbar" style={{ gap: "12px", width: "100%", justifyContent: "center", marginBottom: 0 }}>
            <a className="button-link button-link--accent" href={result.url} download="cropped.png" style={{ margin: 0 }}>下载图片</a>
            <button type="button" onClick={handleSetAsActive} style={{ margin: 0 }}>设为工坊当前图片</button>
          </div>
        </article>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "20px" }}>拖动裁剪框或调整滑块定位裁剪区域。支持自由裁剪和常用比例预设。</p>
    </div>
  );
}
