"use client";

import { useState, useRef, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function ImageWatermarkTool({ manifest }: ToolAppProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("image.png");

  // Watermark configurations
  const [watermarkText, setWatermarkText] = useState("仅用于某某验证，他用无效");
  const [watermarkType, setWatermarkType] = useState<"tile" | "center" | "bottom-right">("tile");
  const [opacity, setOpacity] = useState(0.2);
  const [angle, setAngle] = useState(-30);
  const [color, setColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(20);
  const [gridSpacing, setGridSpacing] = useState(160);

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load a file as Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadImage(file);
  };

  const loadImage = (file: File) => {
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setCopied(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file);
    }
  };

  // Redraw watermark on canvas
  const drawWatermark = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match the original image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 1. Draw original image
    ctx.drawImage(img, 0, 0);

    // 2. Setup styles
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 4;

    if (watermarkType === "tile") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const rad = (angle * Math.PI) / 180;
      const maxDim = Math.max(canvas.width, canvas.height) * 1.8; // Expanded bounds to ensure coverage under rotation
      
      // Measure text width to calculate dynamic spacing that scales with text length and font size
      const textWidth = ctx.measureText(watermarkText).width || 100;
      const pitchX = textWidth + gridSpacing;
      const pitchY = fontSize + gridSpacing;

      // Move to center of canvas and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);

      // Draw grid
      for (let x = -maxDim; x < maxDim; x += pitchX) {
        for (let y = -maxDim; y < maxDim; y += pitchY) {
          // Stagger alternate rows
          const rowOffset = (Math.floor(y / pitchY) % 2 === 0) ? pitchX / 2 : 0;
          ctx.fillText(watermarkText, x + rowOffset, y);
        }
      }
    } else if (watermarkType === "center") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${fontSize * 1.6}px sans-serif`; // slightly larger for center

      const rad = (angle * Math.PI) / 180;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.fillText(watermarkText, 0, 0);
    } else if (watermarkType === "bottom-right") {
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.font = `${fontSize}px sans-serif`;
      
      // Draw 20px off the bottom right edge
      ctx.fillText(watermarkText, canvas.width - 24, canvas.height - 24);
    }

    ctx.restore();
  };

  // Re-run draw whenever settings or image changes
  useEffect(() => {
    if (imageSrc) {
      // Create HTMLImageElement to read sizes
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imgRef.current = img;
        drawWatermark();
      };
    }
  }, [imageSrc, watermarkText, watermarkType, opacity, angle, color, fontSize, gridSpacing]);

  // Download watermarked image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const originalBase = imageName.substring(0, imageName.lastIndexOf(".")) || imageName;
    link.href = dataUrl;
    link.download = `${originalBase}-watermarked.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy watermarked image to clipboard
  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }, "image/png");
    } catch (e) {
      console.error(e);
      alert("复制失败，您的浏览器可能不支持直接复制图片。建议点击下方「下载水印图片」按钮。");
    }
  };

  const handleClear = () => {
    setImageSrc(null);
    setImageName("image.png");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图片与安全</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {!imageSrc ? (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "12px",
            background: "var(--bg-muted)",
            padding: "3.5rem 1rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🛡️</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            上传需要加水印的图片
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", maxWidth: "380px", margin: "0 auto" }}>
            支持拖拽图片到此或点击浏览。图片处理完全在本地浏览器沙箱中进行，<strong>绝不上传任何服务器</strong>，保护您的个人证件隐私。
          </p>
        </div>
      ) : (
        /* Image Editor Workspace */
        <div>
          {/* Action Header */}
          <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", flex: 1, gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                当前图片: <strong>{imageName}</strong>
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="button--primary" onClick={handleCopy}>
                {copied ? "已复制图片" : "复制图片"}
              </button>
              <button type="button" className="button--primary" onClick={handleDownload}>
                下载水印图片
              </button>
              <button type="button" className="button--danger" onClick={handleClear}>
                重新上传
              </button>
            </div>
          </div>

          <div
            className="workspace"
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
              gap: "1.2rem",
              alignItems: "start"
            }}
          >
            {/* Sidebar Controls */}
            <aside
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)" }}>水印参数设置</div>

              {/* Watermark text */}
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>水印文字</span>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="请输入加注的水印文本..."
                  style={{ width: "100%", background: "var(--bg-base)" }}
                />
              </div>

              {/* Layout mode */}
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>排列方式</span>
                <select
                  value={watermarkType}
                  onChange={(e) => setWatermarkType(e.target.value as any)}
                  style={{ width: "100%", background: "var(--bg-base)" }}
                >
                  <option value="tile">平铺铺满 (防盗首选)</option>
                  <option value="center">单个居中</option>
                  <option value="bottom-right">单个右下角 (常规签名)</option>
                </select>
              </div>

              {/* Color Selection */}
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>水印颜色</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: "50px", height: "30px", padding: 0 }}
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ flex: 1, background: "var(--bg-base)" }}
                  />
                </div>
              </div>

              {/* Opacity slider */}
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>不透明度</span>
                  <strong>{Math.round(opacity * 100)}%</strong>
                </span>
                <input
                  type="range"
                  min={0.02}
                  max={0.8}
                  step={0.02}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Angle slider */}
              {watermarkType !== "bottom-right" && (
                <div className="tool-field" style={{ gap: "0.25rem" }}>
                  <span style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>旋转角度</span>
                    <strong>{angle}°</strong>
                  </span>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    step={5}
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {/* Font Size slider */}
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>文字大小</span>
                  <strong>{fontSize}px</strong>
                </span>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={2}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Grid Spacing slider */}
              {watermarkType === "tile" && (
                <div className="tool-field" style={{ gap: "0.25rem" }}>
                  <span style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>平铺间距</span>
                    <strong>{gridSpacing}px</strong>
                  </span>
                  <input
                    type="range"
                    min={80}
                    max={350}
                    step={10}
                    value={gridSpacing}
                    onChange={(e) => setGridSpacing(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </aside>

            {/* Canvas Preview Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>水印效果实时预览</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "1rem",
                  maxHeight: "600px",
                  overflow: "auto"
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "540px",
                    objectFit: "contain",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="tool-note" style={{ marginTop: "1.2rem" }}>
        🔒 隐私申明：本工具使用 HTML5 Canvas 绘图渲染。所有的图片加载、合并、处理以及导出均发生在您本地计算机的浏览器主线程中，<strong>没有网络通信，绝不上传到任何服务器</strong>。您可以完全断网使用，绝对安全。
      </p>
    </section>
  );
}
