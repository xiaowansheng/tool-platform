"use client";

import { useState, useRef, useEffect } from "react";

interface WatermarkProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

export default function ImageWatermarkTab({ activeFile, onChangeFile }: WatermarkProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Watermark configurations
  const [watermarkText, setWatermarkText] = useState("仅用于某某验证，他用无效");
  const [watermarkType, setWatermarkType] = useState<"tile" | "center" | "bottom-right">("tile");
  const [opacity, setOpacity] = useState(0.2);
  const [angle, setAngle] = useState(-30);
  const [color, setColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(20);
  const [gridSpacing, setGridSpacing] = useState(160);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync activeFile from parent
  useEffect(() => {
    if (!activeFile) {
      setImageSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setCopied(false);
      }
    };
    reader.readAsDataURL(activeFile);
  }, [activeFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChangeFile(file);
    }
  };

  // Redraw watermark on canvas
  const drawWatermark = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Setup styles
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
      const maxDim = Math.max(canvas.width, canvas.height) * 1.8;
      const textWidth = ctx.measureText(watermarkText).width || 100;
      const pitchX = textWidth + gridSpacing;
      const pitchY = fontSize + gridSpacing;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);

      for (let x = -maxDim; x < maxDim; x += pitchX) {
        for (let y = -maxDim; y < maxDim; y += pitchY) {
          const rowOffset = (Math.floor(y / pitchY) % 2 === 0) ? pitchX / 2 : 0;
          ctx.fillText(watermarkText, x + rowOffset, y);
        }
      }
    } else if (watermarkType === "center") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${fontSize * 1.6}px sans-serif`;

      const rad = (angle * Math.PI) / 180;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.fillText(watermarkText, 0, 0);
    } else if (watermarkType === "bottom-right") {
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(watermarkText, canvas.width - 24, canvas.height - 24);
    }

    ctx.restore();
  };

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imgRef.current = img;
        drawWatermark();
      };
    }
  }, [imageSrc, watermarkText, watermarkType, opacity, angle, color, fontSize, gridSpacing]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const originalName = activeFile?.name || "image.png";
    const originalBase = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    link.href = dataUrl;
    link.download = `${originalBase}-watermarked.png`;
    link.click();
  };

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

  const handleSetAsActive = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFile) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const cleanFile = new File([blob], `watermarked-${activeFile.name}`, { type: "image/png" });
        onChangeFile(cleanFile);
      }
    }, "image/png");
  };

  return (
    <div>
      <div className="tool-toolbar" style={{ marginBottom: "20px" }}>
        <label className="tool-field tool-field--compact">
          <span>选择图片</span>
          <input type="file" onChange={handleFileChange} accept="image/*" />
        </label>
        {imageSrc && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="button--primary" onClick={handleCopy} style={{ margin: 0 }}>
              {copied ? "已复制图片" : "复制图片"}
            </button>
            <button type="button" className="button--primary" onClick={handleDownload} style={{ margin: 0 }}>
              下载水印图片
            </button>
            <button type="button" onClick={handleSetAsActive} style={{ margin: 0 }}>
              设为工坊当前图片
            </button>
          </div>
        )}
      </div>

      {imageSrc ? (
        <div className="workspace" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Sidebar Controls */}
          <aside
            style={{
              background: "var(--bg-muted)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}
          >
            <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>水印参数设置</div>

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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>水印效果实时预览</div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                padding: "16px",
                maxHeight: "500px",
                overflow: "auto"
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: "100%",
                  maxHeight: "440px",
                  objectFit: "contain",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: "40px 20px", border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", textAlign: "center", marginTop: "20px" }}>
          <strong>等待图片上传</strong>
          <p className="tool-note" style={{ margin: "8px 0 0 0" }}>选择一张证件、文档图片即可本地极速合成防盗水印，防止个人隐私被二次盗用。</p>
        </div>
      )}

      <p className="tool-note" style={{ marginTop: "20px" }}>
        🔒 隐私声明：所有的图片加载、合并、处理以及导出均发生在您本地浏览器中，<strong>绝不上传任何服务器</strong>。
      </p>
    </div>
  );
}
