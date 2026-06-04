"use client";

import { useEffect, useState } from "react";

type Direction = "horizontal" | "vertical";

interface ImageItem {
  file: File;
  url: string;
  img: HTMLImageElement;
}

interface StitcherProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

function loadImage(file: File): Promise<{ url: string; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ url, img });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
    img.src = url;
  });
}

export default function ImageStitcherTab({ activeFile, onChangeFile }: StitcherProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [direction, setDirection] = useState<Direction>("horizontal");
  const [gap, setGap] = useState(0);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [result, setResult] = useState<{ url: string; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  function clearImages() {
    for (const item of images) URL.revokeObjectURL(item.url);
    setImages([]);
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const newItems: ImageItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const { url, img } = await loadImage(file);
        newItems.push({ file, url, img });
      } catch { /* skip invalid */ }
    }

    setImages((prev) => [...prev, ...newItems]);
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  async function importActiveFile() {
    if (!activeFile) return;
    setError("");
    try {
      const { url, img } = await loadImage(activeFile);
      setImages((prev) => [...prev, { file: activeFile, url, img }]);
      if (result?.url) URL.revokeObjectURL(result.url);
      setResult(null);
    } catch {
      setError("导入当前主图片失败");
    }
  }

  function removeImage(index: number) {
    const item = images[index];
    if (item) { URL.revokeObjectURL(item.url); }
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  async function handleStitch() {
    if (images.length < 2) { setError("请至少添加 2 张图片"); return; }
    setBusy(true); setError("");

    try {
      if (result?.url) URL.revokeObjectURL(result.url);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      if (direction === "horizontal") {
        const maxH = Math.max(...images.map((i) => i.img.naturalHeight));
        canvas.width = images.reduce((s, i) => s + i.img.naturalWidth, 0) + gap * (images.length - 1);
        canvas.height = maxH;
      } else {
        const maxW = Math.max(...images.map((i) => i.img.naturalWidth));
        canvas.width = maxW;
        canvas.height = images.reduce((s, i) => s + i.img.naturalHeight, 0) + gap * (images.length - 1);
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let offset = 0;
      for (const item of images) {
        if (direction === "horizontal") {
          ctx.drawImage(item.img, offset, 0);
          offset += item.img.naturalWidth + gap;
        } else {
          ctx.drawImage(item.img, 0, offset);
          offset += item.img.naturalHeight + gap;
        }
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("导出失败")), "image/png");
      });
      setResult({ url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "拼接失败");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>添加多张图片</span>
          <input type="file" accept="image/*" multiple onChange={(e) => void handleFiles(e.target.files)} />
        </label>
        {activeFile && (
          <div className="tool-field tool-field--compact" style={{ justifyContent: "flex-end" }}>
            <span>&nbsp;</span>
            <button type="button" className="button--secondary" onClick={importActiveFile}>
              📥 导入当前主图片 ({activeFile.name})
            </button>
          </div>
        )}
        <label className="tool-field tool-field--compact">
          <span>拼接方向</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            <option value="horizontal">横向拼接</option>
            <option value="vertical">纵向拼接</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>间距 (px)</span>
          <input type="number" min="0" max="100" value={gap} onChange={(e) => setGap(Number(e.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>背景色</span>
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
        </label>
      </div>

      <div className="tool-toolbar" style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" className="button--primary" onClick={() => void handleStitch()} disabled={busy || images.length < 2}>
          {busy ? "拼接中…" : `拼接 ${images.length} 张图片`}
        </button>
        {images.length > 0 ? <button type="button" className="button--danger" onClick={clearImages}>清空列表</button> : null}
      </div>

      {images.length > 0 ? (
        <div className="case-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          {images.map((item, i) => (
            <article key={i} className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-muted)" }}>
              <div className="tool-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><p className="eyebrow" style={{ margin: 0 }}>#{i + 1}</p><h3 style={{ margin: 0, fontSize: "0.85rem" }}>{item.img.naturalWidth}×{item.img.naturalHeight}</h3></div>
                <button type="button" className="button--danger" style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem" }} onClick={() => removeImage(i)}>移除</button>
              </div>
              <img className="media-preview" src={item.url} alt={`图片 ${i + 1}`} style={{ maxWidth: "100%", maxHeight: "120px", objectFit: "contain", borderRadius: "4px" }} />
            </article>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem 1rem", border: "2px dashed var(--border)", borderRadius: "12px", background: "var(--bg-muted)", color: "var(--text-tertiary)" }}>
          💡 请添加至少 2 张图片开始拼接。支持多选上传。
        </div>
      )}

      {result ? (
        <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-muted)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>拼接结果 ({result.width} × {result.height})</p>
          <div style={{ display: "flex", justifyContent: "center", background: "var(--bg-base)", padding: "1rem", borderRadius: "4px" }}>
            <img className="media-preview" src={result.url} alt="拼接结果" style={{ maxWidth: "100%", maxHeight: "500px", objectFit: "contain" }} />
          </div>
          <div className="tool-toolbar">
            <a className="button-link button-link--accent" href={result.url} download="stitched.png" style={{ display: "inline-block", padding: "0.5rem 1rem", background: "var(--accent, #3b82f6)", color: "#fff", textDecoration: "none", borderRadius: "4px", fontWeight: "bold" }}>下载拼接图片</a>
          </div>
        </article>
      ) : null}

      {error ? <p className="tool-error" style={{ color: "var(--danger, #ef4444)" }}>{error}</p> : null}
      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>图片按添加顺序排列。拼接在浏览器本地 Canvas 中完成，不上传。</p>
    </div>
  );
}
