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

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "integer", "rhoncus", "velit", "vitae", "nibh", "facilisis", "porta", "curabitur",
  "workflow", "platform", "runtime", "canvas", "system", "module", "signal", "studio"
];

function generateLoremSentence(seed: number, length: number) {
  const selected = Array.from({ length }, (_, index) => LOREM_WORDS[(seed + index * 5) % LOREM_WORDS.length] ?? "lorem");
  const text = selected.join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function generateLoremText(paragraphs: number, sentencesPerParagraph: number) {
  return Array.from({ length: paragraphs }, (_, paragraphIndex) =>
    Array.from({ length: sentencesPerParagraph }, (_, sentenceIndex) =>
      generateLoremSentence(paragraphIndex * 7 + sentenceIndex * 3, 8 + ((paragraphIndex + sentenceIndex) % 6))
    ).join(" ")
  ).join("\n\n");
}

export default function PlaceholderGeneratorTool({ manifest }: ToolAppProps) {
  const [activeTab, setActiveTab] = useState<"image" | "lorem">("image");

  // Tab 1: Image Placeholder States
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(250);
  const [bgColor, setBgColor] = useState("#eeeeee");
  const [textColor, setTextColor] = useState("#666666");
  const [fontFamily, setFontFamily] = useState("system-ui, -apple-system, sans-serif");
  const [customText, setCustomText] = useState("");
  const [fontSizePercent, setFontSizePercent] = useState(10);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [copiedBase64, setCopiedBase64] = useState(false);

  // Tab 2: Lorem Ipsum States
  const [paragraphs, setParagraphs] = useState(3);
  const [sentences, setSentences] = useState(4);
  const [copiedLorem, setCopiedLorem] = useState(false);

  // Image Placeholder computed values
  const displayText = customText.trim() !== "" ? customText : `${width} x ${height}`;
  const computedFontSize = useMemo(() => {
    const minDim = Math.min(width, height);
    return Math.max(10, Math.round(minDim * (fontSizePercent / 100)));
  }, [width, height, fontSizePercent]);

  const svgString = useMemo(() => {
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

  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgString);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

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

  // Lorem generator computed values
  const loremOutput = useMemo(() => {
    return generateLoremText(
      Math.max(1, Math.min(20, paragraphs)),
      Math.max(1, Math.min(12, sentences))
    );
  }, [paragraphs, sentences]);

  const handleCopyLorem = async () => {
    try {
      await navigator.clipboard.writeText(loremOutput);
      setCopiedLorem(true);
      setTimeout(() => setCopiedLorem(false), 2000);
    } catch (e) {
      console.error(e);
    }
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

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #eee", gap: "24px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("image")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "image" ? "bold" : "normal",
            color: activeTab === "image" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "image" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          🖼️ 图片占位图
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lorem")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "lorem" ? "bold" : "normal",
            color: activeTab === "lorem" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "lorem" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          ✍️ 文本占位符 (Lorem Ipsum)
        </button>
      </div>

      {activeTab === "image" ? (
        <>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
            {/* Left Side: Parameters */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div className="detail-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>⚙️ 自定义参数</h3>

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
                  <button type="button" className="button--primary" onClick={handleDownloadSvg}>
                    📥 下载 SVG 矢量图
                  </button>
                  <button type="button" className="button--primary" onClick={handleDownloadPng}>
                    📥 下载 PNG 格式
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.2rem" }}>
                  <button type="button" className="button--secondary" onClick={handleCopySvg}>
                    {copiedSvg ? "已复制 SVG" : "📋 复制 SVG 代码"}
                  </button>
                  <button type="button" className="button--secondary" onClick={handleCopyBase64}>
                    {copiedBase64 ? "已复制 Base64" : "📋 复制 Base64 URL"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="tool-note" style={{ marginTop: "1.5rem" }}>
            💡 <b>开发者建议：</b> SVG 占位图非常适合在前端原型开发中使用。复制其 SVG 代码可以作为内联矢量标签直接插入到 React/HTML 中，而 Base64 Data URL 可以直接用作 CSS 属性 `background-image: url(...)` 避免额外的静态资源请求。
          </div>
        </>
      ) : (
        <>
          {/* Lorem Ipsum Generator Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="lorem-layout">
            <div className="detail-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", height: "fit-content" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>⚙️ 生成参数</h3>
              
              <label className="tool-field">
                <span>段落数量 (Paragraphs)</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={paragraphs}
                  onChange={(e) => setParagraphs(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                />
              </label>

              <label className="tool-field">
                <span>每段句数 (Sentences)</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={sentences}
                  onChange={(e) => setSentences(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                />
              </label>

              <button
                type="button"
                className="button--primary"
                onClick={handleCopyLorem}
                style={{ padding: "8px", fontWeight: "600", color: "#fff", background: "#4f46e5", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                {copiedLorem ? "✅ 已复制文本" : "📋 复制占位文本"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>生成结果</span>
              <textarea
                value={loremOutput}
                readOnly
                rows={14}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  backgroundColor: "#fafafa",
                  resize: "vertical"
                }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
