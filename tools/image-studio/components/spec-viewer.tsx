"use client";

import { useState, useEffect } from "react";

interface SpecViewerProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

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

export default function ImageSpecViewerTab({ activeFile, onChangeFile }: SpecViewerProps) {
  const [spec, setSpec] = useState<ImageSpec | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dpi, setDpi] = useState(300);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!activeFile) {
      setSpec(null);
      setPreviewUrl("");
      return;
    }
    
    setError("");
    const url = URL.createObjectURL(activeFile);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const g = gcd(w, h);

      setSpec({
        name: activeFile.name,
        type: activeFile.type,
        fileSize: activeFile.size,
        width: w,
        height: h,
        aspectRatio: `${w / g}:${h / g}`,
        megapixels: (w * h) / 1_000_000,
        printSizeAt300: { w: (w / 300) * 25.4, h: (h / 300) * 25.4 },
        printSizeAt72: { w: (w / 72) * 25.4, h: (h / 72) * 25.4 }
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("图片读取失败");
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  function handleFileChange(file: File | null) {
    onChangeFile(file);
  }

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  const customPrint = spec ? {
    w: ((spec.width / dpi) * 25.4).toFixed(1),
    h: ((spec.height / dpi) * 25.4).toFixed(1)
  } : null;

  return (
    <div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>选择图片</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>自定义 DPI</span>
          <input type="number" min="1" max="2400" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
        </label>
      </div>

      {previewUrl ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "20px" }}>
          <article className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center", alignItems: "center" }}>
            <p className="eyebrow" style={{ alignSelf: "flex-start", margin: 0 }}>图片预览</p>
            <img className="media-preview" src={previewUrl} alt="图片预览" style={{ maxHeight: "320px", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
          </article>

          {spec ? (
            <div className="case-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <article className="detail-card">
                <div className="tool-card__header" style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><p className="eyebrow">尺寸</p><h3>像素</h3></div>
                  <button type="button" onClick={() => void handleCopy("px", `${spec.width} × ${spec.height}`)}>
                    {copied === "px" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="mono-output" style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace", margin: "8px 0 0 0" }}>{spec.width} × {spec.height}</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header">
                  <div><p className="eyebrow">比例</p><h3>宽高比</h3></div>
                </div>
                <p className="mono-output" style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace", margin: "8px 0 0 0" }}>{spec.aspectRatio}</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header">
                  <div><p className="eyebrow">存储</p><h3>文件大小</h3></div>
                </div>
                <p className="mono-output" style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace", margin: "8px 0 0 0" }}>{formatBytes(spec.fileSize)}</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header">
                  <div><p className="eyebrow">MIME</p><h3>格式</h3></div>
                </div>
                <p className="mono-output" style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace", margin: "8px 0 0 0" }}>{spec.type}</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header">
                  <div><p className="eyebrow">像素总量</p><h3>MP</h3></div>
                </div>
                <p className="mono-output" style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace", margin: "8px 0 0 0" }}>{spec.megapixels.toFixed(2)} MP</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header" style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><p className="eyebrow">300 DPI 打印</p><h3>印刷尺寸</h3></div>
                  <button type="button" onClick={() => void handleCopy("300", `${spec.printSizeAt300.w.toFixed(1)} × ${spec.printSizeAt300.h.toFixed(1)} mm`)}>
                    {copied === "300" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="mono-output" style={{ fontSize: "1.1rem", fontFamily: "monospace", margin: "8px 0 0 0" }}>{spec.printSizeAt300.w.toFixed(1)} × {spec.printSizeAt300.h.toFixed(1)} mm</p>
                <p className="mono-output" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{(spec.printSizeAt300.w / 25.4).toFixed(1)} × {(spec.printSizeAt300.h / 25.4).toFixed(1)} in</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header">
                  <div><p className="eyebrow">72 DPI 打印</p><h3>屏幕尺寸</h3></div>
                </div>
                <p className="mono-output" style={{ fontSize: "1.1rem", fontFamily: "monospace", margin: "8px 0 0 0" }}>{spec.printSizeAt72.w.toFixed(1)} × {spec.printSizeAt72.h.toFixed(1)} mm</p>
              </article>
              <article className="detail-card">
                <div className="tool-card__header" style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><p className="eyebrow">{dpi} DPI</p><h3>自定义打印</h3></div>
                  <button type="button" onClick={() => void handleCopy("custom", customPrint ? `${customPrint.w} × ${customPrint.h} mm` : "")}>
                    {copied === "custom" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="mono-output" style={{ fontSize: "1.1rem", fontFamily: "monospace", margin: "8px 0 0 0" }}>{customPrint?.w} × {customPrint?.h} mm</p>
              </article>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: "40px 20px", border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", textAlign: "center", marginTop: "20px" }}>
          <strong>等待图片上传</strong>
          <p className="tool-note" style={{ margin: "8px 0 0 0" }}>选择一张本地图片即可查看其宽高像素、宽高比以及各种打印格式下的尺寸数据。</p>
        </div>
      )}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "20px" }}>打印尺寸计算公式：mm = px ÷ DPI × 25.4。所有信息在浏览器本地提取，图片不会上传服务器。</p>
    </div>
  );
}
