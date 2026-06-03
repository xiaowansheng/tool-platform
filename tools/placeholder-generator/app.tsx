"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const SIZE_PRESETS = [
  { name: "中矩形广告 (300x250)", w: 300, h: 250 },
  { name: "大矩形广告 (336x280)", w: 336, h: 280 },
  { name: "横幅主广告 (728x90)", w: 728, h: 90 },
  { name: "移动端横幅 (320x50)", w: 320, h: 50 },
  { name: "半屏广告 (300x600)", w: 300, h: 600 },
  { name: "HD 720P (1280x720)", w: 1280, h: 720 },
  { name: "FHD 1080P (1920x1080)", w: 1920, h: 1080 },
  { name: "头像 / 社交 (150x150)", w: 150, h: 150 },
  { name: "移动 App 图标 (512x512)", w: 512, h: 512 }
];

const THEME_PRESETS = [
  { label: "中性灰", bg: "#eeeeee", text: "#666666" },
  { label: "极客黑", bg: "#222222", text: "#ffffff" },
  { label: "科技蓝", bg: "#3b82f6", text: "#ffffff" },
  { label: "生态绿", bg: "#10b981", text: "#ffffff" },
  { label: "活力橙", bg: "#f97316", text: "#ffffff" },
  { label: "激情红", bg: "#ef4444", text: "#ffffff" },
  { label: "迷幻紫", bg: "#8b5cf6", text: "#ffffff" },
  { label: "明亮黄", bg: "#eab308", text: "#1e293b" }
];

const FONT_PRESETS = [
  { label: "无衬线 (Sans)", value: "system-ui, -apple-system, sans-serif" },
  { label: "衬线体 (Serif)", value: "Georgia, serif" },
  { label: "等宽体 (Mono)", value: "monospace, Courier" }
];

export default function PlaceholderGeneratorTool({ manifest }: ToolAppProps) {
  // Dimensions
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(250);

  // Styling
  const [bgColor, setBgColor] = useState("#eeeeee");
  const [textColor, setTextColor] = useState("#666666");
  const [fontFamily, setFontFamily] = useState("system-ui, -apple-system, sans-serif");
  
  // Text labels
  const [customText, setCustomText] = useState("");
  const [fontSizePercent, setFontSizePercent] = useState(10); // Percent of min(width, height)

  const [copiedSvg, setCopiedSvg] = useState(false);
  const [copiedBase64, setCopiedBase64] = useState(false);

  // Compute label text (fallback to Width x Height)
  const displayText = customText.trim() !== "" ? customText : `${width} x ${height}`;

  // Compute font size in pixels
  const computedFontSize = useMemo(() => {
    const minDim = Math.min(width, height);
    return Math.max(10, Math.round(minDim * (fontSizePercent / 100)));
  }, [width, height, fontSizePercent]);

  // Generate SVG String
  const svgString = useMemo(() => {
    // Escape XML characters
    const escapedText = displayText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bgColor}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="${fontFamily}" font-size="${computedFontSize}" font-weight="bold" fill="${textColor}">${escapedText}</text>
</svg>`;
  }, [width, height, bgColor, textColor, fontFamily, computedFontSize, displayText]);

  // Copy SVG to clipboard
  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgString);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Copy Base64 to clipboard
  const handleCopyBase64 = async () => {
    try {
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;
      await navigator.clipboard.writeText(dataUrl);
      setCopiedBase64(true);
      setTimeout(() => setCopiedBase64(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Download SVG file
  const handleDownloadSvg = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `placeholder-${width}x${height}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download PNG file
  const handleDownloadPng = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = `placeholder-${width}x${height}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.error("Canvas toDataURL failed:", e);
          alert("导出 PNG 失败。您的浏览器可能受到安全限制，请直接下载 SVG。");
        }
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图片与设计</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Preset sizes / themes row */}
      <div className="detail-card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>
              📏 尺寸预设
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="button--secondary"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  onClick={() => {
                    setWidth(p.w);
                    setHeight(p.h);
                  }}
                >
                  {p.name.split(" ")[0]} ({p.w}x{p.h})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginTop: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500, display: "block", marginBottom: "0.4rem" }}>
              🎨 配色主题
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {THEME_PRESETS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className="button--secondary"
                  style={{ 
                    fontSize: "0.75rem", 
                    padding: "0.25rem 0.5rem",
                    borderLeft: `6px solid ${t.bg}`
                  }}
                  onClick={() => {
                    setBgColor(t.bg);
                    setTextColor(t.text);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace split columns */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
          gap: "2rem" 
        }}
      >
        {/* Left Side: Parameters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="detail-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>⚙️ 自定义参数</h3>

            {/* Custom dimensions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>宽度 (Width px)</span>
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={width}
                  onChange={(e) => setWidth(Math.max(10, Number(e.target.value)))}
                  style={{ width: "100%", background: "var(--bg-base)" }}
                />
              </div>
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>高度 (Height px)</span>
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={height}
                  onChange={(e) => setHeight(Math.max(10, Number(e.target.value)))}
                  style={{ width: "100%", background: "var(--bg-base)" }}
                />
              </div>
            </div>

            {/* Text label */}
            <div className="tool-field" style={{ gap: "0.25rem" }}>
              <span>文字内容</span>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={`默认显示尺寸（${width} x ${height}）`}
                style={{ width: "100%", background: "var(--bg-base)" }}
              />
            </div>

            {/* Custom background and text colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>背景颜色</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: "36px", height: "36px", padding: 0 }}
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ flex: 1, background: "var(--bg-base)" }}
                  />
                </div>
              </div>
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>文字颜色</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ width: "36px", height: "36px", padding: 0 }}
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ flex: 1, background: "var(--bg-base)" }}
                  />
                </div>
              </div>
            </div>

            {/* Font Family selector */}
            <div className="tool-field" style={{ gap: "0.25rem" }}>
              <span>文字字体</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                style={{ width: "100%", background: "var(--bg-base)" }}
              >
                {FONT_PRESETS.map((f) => (
                  <option key={f.label} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Font size percent */}
            <div className="tool-field" style={{ gap: "0.25rem" }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>字体大小比例</span>
                <strong>{computedFontSize}px ({fontSizePercent}%)</strong>
              </span>
              <input
                type="range"
                min={3}
                max={30}
                step={0.5}
                value={fontSizePercent}
                onChange={(e) => setFontSizePercent(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Preview & Export */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          
          {/* SVG Preview Container */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
              占位图效果实时预览
            </span>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "2rem 1rem",
                minHeight: "260px",
                overflow: "auto"
              }}
            >
              {/* Scaled Preview wrapper to prevent viewport overflow on huge images */}
              <div 
                style={{
                  maxWidth: "100%",
                  maxHeight: "360px",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
                }}
                dangerouslySetInnerHTML={{ __html: svgString }}
              />
            </div>
          </div>

          {/* Action Toolbar */}
          <div 
            className="detail-card" 
            style={{ 
              padding: "1.25rem", 
              display: "flex", 
              flexDirection: "column", 
              gap: "0.75rem",
              background: "linear-gradient(to right, var(--bg-card), var(--bg-muted))"
            }}
          >
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>📤 导出占位图</h4>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <button 
                type="button" 
                className="button--primary" 
                onClick={handleDownloadSvg}
              >
                📥 下载 SVG 矢量图
              </button>
              <button 
                type="button" 
                className="button--primary" 
                onClick={handleDownloadPng}
              >
                📥 下载 PNG 格式
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.2rem" }}>
              <button 
                type="button" 
                className="button--secondary" 
                onClick={handleCopySvg}
              >
                {copiedSvg ? "已复制 SVG" : "📋 复制 SVG 代码"}
              </button>
              <button 
                type="button" 
                className="button--secondary" 
                onClick={handleCopyBase64}
              >
                {copiedBase64 ? "已复制 Base64" : "📋 复制 Base64 URL"}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="tool-note" style={{ marginTop: "1.5rem" }}>
        💡 <b>开发者建议：</b> SVG 占位图非常适合在前端原型开发中使用。复制其 SVG 代码可以作为内联矢量标签直接插入到 React/HTML 中，而 Base64 Data URL 可以直接用作 CSS 属性 `background-image: url(...)` 或 `&lt;img src="..."&gt;` 的数据源，避免额外的静态资源请求。
      </div>
    </section>
  );
}
