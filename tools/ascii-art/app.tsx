"use client";

import { useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { FONTS, renderAscii } from "./fonts";

const PRESETS = [
  { name: "LOVE", text: "LOVE" },
  { name: "HELLO", text: "HELLO" },
  { name: "CODER", text: "CODER" },
  { name: "NEON", text: "NEON" },
  { name: "GEEK", text: "GEEK" }
];

const PREMADE_ARTS = [
  {
    name: "猫咪 (Cat)",
    art: ` /\\_/\\ \n( o.o )\n > ^ < `
  },
  {
    name: "爱心 (Heart)",
    art: `  ▄████▄████▄  \n ██▒▒▒▒█▒▒▒▒██ \n ▀██▒▒▒▒▒▒▒██▀ \n   ▀██▒▒▒▒██▀   \n     ▀████▀     `
  },
  {
    name: "兔子 (Rabbit)",
    art: ` (\\___/) \n (='.'=) \n (")_(")`
  },
  {
    name: "咖啡杯 (Coffee)",
    art: `  (  )   (  )\n   ) (    ) (\n  [~~~~~~~~~~]═╗\n   \\        /  ║\n    \\______/  ═╝\n ═══════════════`
  },
  {
    name: "恶魔笑脸 (Devil Face)",
    art: ` 😈  Ψ(｀▽´)Ψ \n┌( ಠ_ಠ )┘ \n  (⊙_◎)`
  },
  {
    name: "游戏机 (Gamepad)",
    art: ` ┌──────────────┐\n │ ▄  O  O   O  │\n │▄█▄     O  O  │\n │ ▀            │\n └──────────────┘`
  }
];

const THEMES = [
  { id: "default", name: "标准白", color: "var(--text-primary)", glow: "none" },
  { id: "matrix", name: "黑客绿", color: "#33ff33", glow: "0 0 10px rgba(51, 255, 51, 0.6)" },
  { id: "neon-cyan", name: "冰晶蓝", color: "#00f0ff", glow: "0 0 10px rgba(0, 240, 255, 0.6)" },
  { id: "neon-magenta", name: "粉红霓虹", color: "#ff007f", glow: "0 0 10px rgba(255, 0, 127, 0.6)" },
  { id: "warning-amber", name: "警示黄", color: "#fbbf24", glow: "0 0 8px rgba(251, 191, 36, 0.5)" },
  { id: "lava-red", name: "熔岩红", color: "#ef4444", glow: "0 0 10px rgba(239, 68, 68, 0.6)" }
];

export default function AsciiArtTool({ manifest }: ToolAppProps) {
  const [inputText, setInputText] = useState("CODER");
  const [selectedFont, setSelectedFont] = useState("slant");
  const [colorTheme, setColorTheme] = useState("neon-cyan");
  
  // Customizable settings
  const [charSpacing, setCharSpacing] = useState(0); // Spacing between letters
  const [replaceCharFrom, setReplaceCharFrom] = useState("");
  const [replaceCharTo, setReplaceCharTo] = useState("");
  const [copied, setCopied] = useState(false);

  // Premade selected art
  const [customArt, setCustomArt] = useState<string | null>(null);

  // Generate standard ASCII art
  let outputArt = renderAscii(inputText, selectedFont);

  // Apply character spacing (adding space characters in between blocks)
  if (charSpacing > 0 && outputArt) {
    const spacingStr = " ".repeat(charSpacing);
    const fontHeight = FONTS[selectedFont]?.height ?? 5;
    const lines = outputArt.split("\n");
    if (lines.length === fontHeight) {
      // For each line, we want to pad columns. But since they are pre-rendered as strings,
      // it is easier to add space when joining, which we've done in renderAscii.
      // Alternatively, we can parse character-by-character.
      // Let's implement custom spacing during join in renderAscii or right here:
      const renderedLines = Array(fontHeight).fill("");
      const font = FONTS[selectedFont];
      if (font) {
        for (let i = 0; i < inputText.length; i++) {
          const char = inputText[i].toUpperCase();
          const charRows = font.chars[char] ?? font.chars[" "];
          for (let r = 0; r < fontHeight; r++) {
            renderedLines[r] += charRows[r] + (i < inputText.length - 1 ? spacingStr : "");
          }
        }
        outputArt = renderedLines.join("\n");
      }
    }
  }

  // Apply character replacement if set
  if (replaceCharFrom && outputArt) {
    outputArt = outputArt.replaceAll(replaceCharFrom, replaceCharTo);
  }

  // Active theme properties
  const activeTheme = THEMES.find((t) => t.id === colorTheme) ?? THEMES[0];

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy art", err);
    }
  };

  const handleDownload = (textToDownload: string) => {
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ascii-art-${inputText || "download"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePresetClick = (presetText: string) => {
    setCustomArt(null);
    setInputText(presetText);
  };

  const handlePremadeClick = (artContent: string) => {
    setCustomArt(artContent);
  };

  const clearAll = () => {
    setInputText("");
    setCustomArt(null);
  };

  // Determine what is shown in the workspace
  const finalDisplayArt = customArt !== null ? customArt : outputArt;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本与设计</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Main Options Toolbar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="button--secondary"
              style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
              onClick={() => handlePresetClick(preset.text)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="button--primary"
            onClick={() => handleCopy(finalDisplayArt)}
            disabled={!finalDisplayArt}
          >
            {copied ? "已复制" : "复制艺术字"}
          </button>
          <button
            type="button"
            className="button--secondary"
            onClick={() => handleDownload(finalDisplayArt)}
            disabled={!finalDisplayArt}
          >
            下载为文本
          </button>
          <button type="button" className="button--danger" onClick={clearAll}>
            清空内容
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div
        className="detail-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.2rem"
        }}
      >
        {/* Font Select */}
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: "600" }}>选择字体</label>
          <select
            value={selectedFont}
            onChange={(e) => {
              setCustomArt(null);
              setSelectedFont(e.target.value);
            }}
            style={{ width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.3rem", color: "var(--text-primary)" }}
          >
            {Object.keys(FONTS).map((fontKey) => (
              <option key={fontKey} value={fontKey}>
                {FONTS[fontKey].name}
              </option>
            ))}
          </select>
        </div>

        {/* Color Theme Selector */}
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: "600" }}>显示色彩</label>
          <select
            value={colorTheme}
            onChange={(e) => setColorTheme(e.target.value)}
            style={{ width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.3rem", color: "var(--text-primary)" }}
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>

        {/* Spacing Slider */}
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: "600" }}>字符间距: {charSpacing}</label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={charSpacing}
            onChange={(e) => {
              setCustomArt(null);
              setCharSpacing(Number(e.target.value));
            }}
            style={{ width: "100%", accentColor: "var(--accent-primary)" }}
          />
        </div>

        {/* Character Replacer */}
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: "600" }}>符号替换 (源 ➜ 目标)</label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              type="text"
              placeholder="源"
              maxLength={1}
              value={replaceCharFrom}
              onChange={(e) => {
                setCustomArt(null);
                setReplaceCharFrom(e.target.value);
              }}
              style={{ width: "50%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.2rem 0.4rem", color: "var(--text-primary)", textAlign: "center" }}
            />
            <input
              type="text"
              placeholder="目标"
              maxLength={1}
              value={replaceCharTo}
              onChange={(e) => {
                setCustomArt(null);
                setReplaceCharTo(e.target.value);
              }}
              style={{ width: "50%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.2rem 0.4rem", color: "var(--text-primary)", textAlign: "center" }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Input and Visual Display Workspace */}
      <div className="workspace workspace--stack" style={{ gap: "1rem" }}>
        {/* Input area */}
        <label className="tool-field">
          <span>横幅文本输入 (仅支持英文数字及部分标点)</span>
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setCustomArt(null);
              setInputText(e.target.value);
            }}
            placeholder="在输入框中输入文本以实时生成 ASCII 艺术字..."
            style={{ fontSize: "1.1rem", padding: "0.6rem 0.8rem", width: "100%" }}
          />
        </label>

        {/* Output Pre Block */}
        <div className="tool-field">
          <span>艺术字预览</span>
          <div
            style={{
              position: "relative",
              width: "100%",
              minHeight: "220px",
              background: "#0c0d10",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "1.2rem",
              overflow: "auto",
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)"
            }}
          >
            {finalDisplayArt ? (
              <pre
                style={{
                  margin: 0,
                  fontFamily: "monospace",
                  fontSize: "1rem",
                  lineHeight: "1.2",
                  color: activeTheme.color,
                  textShadow: activeTheme.glow,
                  whiteSpace: "pre",
                  width: "max-content"
                }}
              >
                {finalDisplayArt}
              </pre>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  color: "var(--text-tertiary)"
                }}
              >
                暂无生成内容，请在上方输入
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pre-made ASCII Arts Catalog */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "8px"
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.8rem" }}>
          趣味字符画库 (点击快速导入)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.6rem"
          }}
        >
          {PREMADE_ARTS.map((item) => (
            <button
              key={item.name}
              type="button"
              className="button--secondary"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.6rem",
                height: "auto"
              }}
              onClick={() => handlePremadeClick(item.art)}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.3rem" }}>{item.name}</div>
              <pre style={{ fontSize: "0.55rem", margin: 0, opacity: 0.7, color: "var(--text-secondary)", pointerEvents: "none" }}>
                {item.art}
              </pre>
            </button>
          ))}
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：部分字体较宽，生成长文本横幅时如果超出屏幕，可以通过滚动条水平滑动查看。支持符号替换，可以创造独一无二的像素字。
      </p>
    </section>
  );
}
