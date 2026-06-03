"use client";

import { useState, useRef, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const PRESETS = [
  {
    name: "JavaScript 示例",
    title: "index.js",
    code: `// 简单的问候函数并计算平方
function greetUser(name) {
  const message = \`Hello, \${name}! Welcome to our platform.\`;
  console.log(message);
  return message;
}

const square = (x) => x * x;
const result = square(8);
greetUser("Developer");`
  },
  {
    name: "React 组件",
    title: "Card.tsx",
    code: `import React from "react";

interface CardProps {
  title: string;
  desc: string;
}

export default function Card({ title, desc }: CardProps) {
  return (
    <div className="card shadow-lg p-6 bg-slate-900 border border-slate-700 rounded-2xl">
      <h3 className="text-xl text-cyan-400 font-bold mb-2">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}`
  },
  {
    name: "CSS 渐变样式",
    title: "theme.css",
    code: `/* 毛玻璃与霓虹发光卡片样式 */
.neon-glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}`
  }
];

const GRADIENTS = [
  { id: "sunset", name: "落日余晖", style: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)", color1: "#f5576c", color2: "#f093fb" },
  { id: "cyberpunk", name: "赛博霓虹", style: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color1: "#667eea", color2: "#764ba2" },
  { id: "ocean", name: "蔚蓝海域", style: "linear-gradient(135deg, #13f1fc 0%, #0470dc 100%)", color1: "#13f1fc", color2: "#0470dc" },
  { id: "aurora", name: "极光森林", style: "linear-gradient(135deg, #5af158 0%, #11a080 100%)", color1: "#5af158", color2: "#11a080" },
  { id: "synthwave", name: "电子浪潮", style: "linear-gradient(135deg, #ff007f 0%, #7f00ff 100%)", color1: "#ff007f", color2: "#7f00ff" },
  { id: "minimal-dark", name: "极简暗色", style: "linear-gradient(135deg, #232526 0%, #414345 100%)", color1: "#232526", color2: "#414345" },
  { id: "minimal-light", name: "净白优雅", style: "linear-gradient(135deg, #e0e0e0 0%, #f5f7fa 100%)", color1: "#e0e0e0", color2: "#f5f7fa" }
];

const CODE_THEMES = [
  { id: "dark", name: "极客暗黑", bg: "#151820", text: "#f8f8f2", comment: "#6272a4", keyword: "#ff79c6", string: "#50fa7b", number: "#bd93f9", tag: "#8be9fd" },
  { id: "classic-black", name: "深邃黑", bg: "#0d0e12", text: "#ffffff", comment: "#6b7280", keyword: "#f43f5e", string: "#10b981", number: "#8b5cf6", tag: "#06b6d4" },
  { id: "light", name: "极简纯白", bg: "#ffffff", text: "#1f2937", comment: "#9ca3af", keyword: "#d946ef", string: "#059669", number: "#7c3aed", tag: "#2563eb" }
];

export default function CodeToImageTool({ manifest }: ToolAppProps) {
  const [code, setCode] = useState(PRESETS[0].code);
  const [tabTitle, setTabTitle] = useState(PRESETS[0].title);
  
  // Customizations
  const [selectedGradient, setSelectedGradient] = useState("cyberpunk");
  const [selectedTheme, setSelectedTheme] = useState("dark");
  const [padding, setPadding] = useState(48); // Background padding in px
  const [borderRadius, setBorderRadius] = useState(12); // Code window border radius
  const [showMacButtons, setShowMacButtons] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [shadowBlur, setShadowBlur] = useState(24);

  const [copiedImage, setCopiedImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeGradient = GRADIENTS.find(g => g.id === selectedGradient) ?? GRADIENTS[0];
  const activeTheme = CODE_THEMES.find(t => t.id === selectedTheme) ?? CODE_THEMES[0];

  // Helper to draw syntax highlighted text to Canvas
  const drawCodeText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    startX: number,
    startY: number,
    lineHeight: number
  ) => {
    ctx.font = `${fontSize}px Consolas, Monaco, "Andale Mono", monospace`;
    ctx.textBaseline = "top";

    const lines = text.split("\n");
    const keywords = ["function", "const", "let", "var", "return", "class", "import", "export", "from", "if", "else", "for", "while", "try", "catch", "async", "await", "interface", "type", "default"];
    
    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      
      // Check if it's entirely a comment line
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) {
        ctx.fillStyle = activeTheme.comment;
        ctx.fillText(line, startX, y);
        return;
      }

      // Regex matching basic code chunks: strings, comments, numbers, words
      const tokenRegex = /(\/\/.*)|(".*?"|'.*?'|`.*?`)|(\b\d+\b)|(\b[a-zA-Z_]\w*\b)|([^\s\w\d"'\`]+)/g;
      let match;
      let lastIndex = 0;
      let currentX = startX;

      while ((match = tokenRegex.exec(line)) !== null) {
        // Draw whitespace leading to token
        const leadingWhitespace = line.substring(lastIndex, match.index);
        if (leadingWhitespace) {
          ctx.fillStyle = activeTheme.text;
          ctx.fillText(leadingWhitespace, currentX, y);
          currentX += ctx.measureText(leadingWhitespace).width;
        }

        const [fullToken, comment, str, num, word] = match;
        let tokenColor = activeTheme.text;

        if (comment) {
          tokenColor = activeTheme.comment;
        } else if (str) {
          tokenColor = activeTheme.string;
        } else if (num) {
          tokenColor = activeTheme.number;
        } else if (word) {
          if (keywords.includes(word)) {
            tokenColor = activeTheme.keyword;
          } else if (word[0] === word[0].toUpperCase() && word.length > 2) {
            tokenColor = activeTheme.tag; // Capitalized class/types
          }
        }

        ctx.fillStyle = tokenColor;
        ctx.fillText(fullToken, currentX, y);
        currentX += ctx.measureText(fullToken).width;
        lastIndex = tokenRegex.lastIndex;
      }

      // Draw remaining part
      const remaining = line.substring(lastIndex);
      if (remaining) {
        ctx.fillStyle = activeTheme.text;
        ctx.fillText(remaining, currentX, y);
      }
    });
  };

  // Render on real canvas
  const renderCanvas = (): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const lines = code.split("\n");
    const lineHeight = fontSize * 1.5;

    // Calculate dimensions
    const codeWidth = 660; // Fixed code box width
    const macBarHeight = showMacButtons || tabTitle ? 40 : 16;
    const codeHeight = macBarHeight + lines.length * lineHeight + 32; // titlebar + code + bottom padding
    
    const canvasWidth = codeWidth + padding * 2;
    const canvasHeight = codeHeight + padding * 2;

    // High-DPI scale (2x)
    const scale = 2;
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(scale, scale);

    // 1. Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, activeGradient.color1);
    gradient.addColorStop(1, activeGradient.color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Setup drop shadow
    ctx.save();
    if (shadowBlur > 0) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 12;
    }

    // 3. Draw code window container
    const wx = padding;
    const wy = padding;
    ctx.fillStyle = activeTheme.bg;
    ctx.beginPath();
    ctx.roundRect(wx, wy, codeWidth, codeHeight, borderRadius);
    ctx.fill();
    ctx.restore(); // remove drop shadow effect for children

    // 4. Draw macOS Titlebar Buttons
    if (showMacButtons) {
      const bx = wx + 16;
      const by = wy + 16;
      const dotSpacing = 16;

      // Close (Red)
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5f56";
      ctx.fill();

      // Minimize (Yellow)
      ctx.beginPath();
      ctx.arc(bx + dotSpacing, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffbd2e";
      ctx.fill();

      // Zoom (Green)
      ctx.beginPath();
      ctx.arc(bx + dotSpacing * 2, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#27c93f";
      ctx.fill();
    }

    // 5. Draw Tab/File Title
    if (tabTitle) {
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = activeTheme.comment;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tx = wx + codeWidth / 2;
      const ty = wy + 16;
      ctx.fillText(tabTitle, tx, ty);
    }

    // 6. Draw Divider Line if macOS bar or title is shown
    if (showMacButtons || tabTitle) {
      ctx.strokeStyle = selectedTheme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wx, wy + macBarHeight);
      ctx.lineTo(wx + codeWidth, wy + macBarHeight);
      ctx.stroke();
    }

    // 7. Draw Code Text
    const tx = wx + 20;
    const ty = wy + macBarHeight + 20;
    drawCodeText(ctx, code, tx, ty, lineHeight);

    return canvas;
  };

  // Re-render canvas whenever settings change
  useEffect(() => {
    renderCanvas();
  }, [code, tabTitle, selectedGradient, selectedTheme, padding, borderRadius, showMacButtons, fontSize, shadowBlur]);

  // Download PNG file
  const handleDownload = () => {
    const canvas = renderCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${tabTitle.replaceAll(".", "-") || "code-snippet"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy PNG image to clipboard
  const handleCopyImage = async () => {
    const canvas = renderCanvas();
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      }, "image/png");
    } catch (err) {
      console.error("无法复制图片到剪贴板，建议直接下载", err);
      alert("您的浏览器可能限制了图片写入剪贴板，请尝试直接点击「下载图片」");
    }
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setCode(preset.code);
    setTabTitle(preset.title);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计与分享</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Presets Bar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="button--secondary"
              style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
              onClick={() => handlePresetSelect(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="button--primary" onClick={handleCopyImage}>
            {copiedImage ? "已复制图片" : "复制图片"}
          </button>
          <button type="button" className="button--secondary" onClick={handleDownload}>
            下载 PNG 图片
          </button>
        </div>
      </div>

      {/* Config Panel and Workspace Workspace */}
      <div
        className="workspace"
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "1.2rem",
          alignItems: "start"
        }}
      >
        {/* Left Side: Customize Sidebar */}
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
          <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)" }}>样式设置</div>

          {/* Background Gradient */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span>渐变背景</span>
            <select
              value={selectedGradient}
              onChange={(e) => setSelectedGradient(e.target.value)}
              style={{ width: "100%", background: "var(--bg-base)" }}
            >
              {GRADIENTS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Code Theme */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span>代码框主题</span>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              style={{ width: "100%", background: "var(--bg-base)" }}
            >
              {CODE_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Window Tab title */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span>窗口文件名</span>
            <input
              type="text"
              value={tabTitle}
              onChange={(e) => setTabTitle(e.target.value)}
              placeholder="e.g. index.js"
              style={{ width: "100%", background: "var(--bg-base)" }}
            />
          </div>

          {/* Background padding */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              <span>外边距</span>
              <strong>{padding}px</strong>
            </span>
            <input
              type="range"
              min={16}
              max={80}
              step={8}
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Border radius */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              <span>圆角大小</span>
              <strong>{borderRadius}px</strong>
            </span>
            <input
              type="range"
              min={0}
              max={24}
              step={2}
              value={borderRadius}
              onChange={(e) => setBorderRadius(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Font Size */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              <span>字号大小</span>
              <strong>{fontSize}px</strong>
            </span>
            <input
              type="range"
              min={12}
              max={20}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Shadow intensity */}
          <div className="tool-field" style={{ gap: "0.25rem" }}>
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              <span>阴影模糊</span>
              <strong>{shadowBlur}px</strong>
            </span>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={shadowBlur}
              onChange={(e) => setShadowBlur(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Show macOS Buttons */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", marginTop: "0.2rem" }}>
            <input
              type="checkbox"
              checked={showMacButtons}
              onChange={(e) => setShowMacButtons(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            显示 macOS 窗口控制按钮
          </label>
        </aside>

        {/* Right Side: Code Editor Input & Image Canvas Live Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* Code Editor */}
          <label className="tool-field">
            <span>输入代码或文本</span>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请在这里粘贴代码片段或随笔文字，左侧样式微调后，下方会自动生成对应的卡片。"
              spellCheck={false}
              style={{
                height: "160px",
                fontFamily: "monospace",
                lineHeight: "1.5",
                fontSize: "0.9rem",
                width: "100%",
                resize: "vertical"
              }}
            />
          </label>

          {/* Live Canvas Preview Panel */}
          <div className="tool-field">
            <span>高清卡片实时预览</span>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "2rem",
                overflow: "auto"
              }}
            >
              {/* This is the hidden-ish export canvas, resized visually */}
              <canvas
                ref={canvasRef}
                style={{
                  display: "block",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1.2rem" }}>
        提示：复制图片功能使用现代浏览器 ClipboardItem API，可将高清 PNG 直接拷贝进剪贴板，方便您直接在聊天工具（Slack、微信）或笔记（Notion、Word）中粘贴分享。
      </p>
    </section>
  );
}
