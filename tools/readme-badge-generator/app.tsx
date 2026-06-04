"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const presetColors = [
  { name: "Bright Green (明绿)", value: "brightgreen", hex: "#4c1" },
  { name: "Green (绿色)", value: "green", hex: "#97ca00" },
  { name: "Yellow Green (黄绿)", value: "yellowgreen", hex: "#a4a61d" },
  { name: "Yellow (黄色)", value: "yellow", hex: "#dfb317" },
  { name: "Orange (橙色)", value: "orange", hex: "#fe7d37" },
  { name: "Red (红色)", value: "red", hex: "#e05d44" },
  { name: "Blue (蓝色)", value: "blue", hex: "#007ec6" },
  { name: "Light Grey (浅灰)", value: "lightgrey", hex: "#9f9f9f" },
  { name: "Dark Grey (深灰)", value: "555555", hex: "#555" },
  { name: "React Blue", value: "61dafb", hex: "#61dafb" },
  { name: "JS Yellow", value: "f7df1e", hex: "#f7df1e" }
];

const presetStyles = [
  { name: "Flat (扁平)", value: "flat" },
  { name: "Flat Square (扁平直角)", value: "flat-square" },
  { name: "Plastic (塑料立体)", value: "plastic" },
  { name: "For The Badge (大徽章)", value: "for-the-badge" },
  { name: "Social (社交关注)", value: "social" }
];

export default function ReadmeBadgeGenerator({ manifest }: ToolAppProps) {
  const [label, setLabel] = useState("license");
  const [message, setMessage] = useState("MIT");
  const [color, setColor] = useState("brightgreen");
  const [customColor, setCustomColor] = useState("");
  const [style, setStyle] = useState("flat");
  const [logo, setLogo] = useState("");
  const [logoColor, setLogoColor] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  // Helper to escape Shields.io characters
  // Dash -> --, Underscore -> __, Space -> _ or %20
  const cleanParam = (val: string) => {
    return val
      .replace(/_/g, "__")
      .replace(/-/g, "--")
      .replace(/ /g, "_");
  };

  const badgeConfig = useMemo(() => {
    const finalColor = customColor.trim() ? customColor.replace("#", "") : color;
    const cleanLabel = cleanParam(label || "label");
    const cleanMessage = cleanParam(message || "message");

    const baseUrl = `https://img.shields.io/badge/${cleanLabel}-${cleanMessage}-${finalColor}`;
    
    const params: string[] = [];
    if (style !== "flat") params.push(`style=${style}`);
    if (logo.trim()) params.push(`logo=${encodeURIComponent(logo.trim())}`);
    if (logoColor.trim()) params.push(`logoColor=${encodeURIComponent(logoColor.trim().replace("#", ""))}`);

    const query = params.length > 0 ? `?${params.join("&")}` : "";
    const fullBadgeUrl = baseUrl + query;

    // Get hex for local preview rendering
    const colorObj = presetColors.find((c) => c.value === color);
    const hexColor = customColor.trim() ? customColor : (colorObj?.hex || "#4c1");

    return {
      url: fullBadgeUrl,
      hexColor
    };
  }, [label, message, color, customColor, style, logo, logoColor]);

  const markdownCode = useMemo(() => {
    const altText = label || "Badge";
    if (link.trim()) {
      return `[![${altText}](${badgeConfig.url})](${link.trim()})`;
    }
    return `![${altText}](${badgeConfig.url})`;
  }, [badgeConfig.url, label, link]);

  const htmlCode = useMemo(() => {
    const altText = label || "Badge";
    if (link.trim()) {
      return `<a href="${link.trim()}"><img src="${badgeConfig.url}" alt="${altText}" /></a>`;
    }
    return `<img src="${badgeConfig.url}" alt="${altText}" />`;
  }, [badgeConfig.url, label, link]);

  const copyCode = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">办公工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column" style={{ gap: "24px" }}>
        {/* Left Column: Form Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="tool-field">
              <span>标签 (Label)</span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例如: license, build, version"
              />
            </label>

            <label className="tool-field">
              <span>内容 (Message)</span>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="例如: MIT, passing, v1.0.0"
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="tool-field">
              <span>内置颜色</span>
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                {presetColors.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="tool-field">
              <span>自定义颜色 (十六进制/Hex)</span>
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="例如: #ff69b4, 333333"
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="tool-field">
              <span>样式风格 (Style)</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                {presetStyles.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="tool-field">
              <span>跳转链接 (可选)</span>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="例如: https://..."
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="tool-field">
              <span>Simple-Icons 图标名 (可选)</span>
              <input
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="例如: github, react, node-dot-js"
              />
            </label>

            <label className="tool-field">
              <span>图标颜色 (可选 Hex)</span>
              <input
                type="text"
                value={logoColor}
                onChange={(e) => setLogoColor(e.target.value)}
                placeholder="例如: white, #ffffff"
              />
            </label>
          </div>
          
          <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>
            提示：Simple-icons 图标名使用小写和连字符，如 <code>node-dot-js</code> (Node.js), <code>github</code>, <code>react</code>。
          </p>
        </div>

        {/* Right Column: Previews and Exporters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Badge Previews */}
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "8px",
              padding: "20px",
              backgroundColor: "var(--background-card, #fcfcfc)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px"
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.6 }}>徽章在线预览</span>
            <img
              src={badgeConfig.url}
              alt="Shields.io Badge Preview"
              style={{ maxHeight: "30px", maxWidth: "100%" }}
              onError={(e) => {
                // Fallback in case shields.io is slow/blocked
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            
            {/* SVG Local fallback render for instant feedback */}
            <div style={{ display: "flex", alignItems: "center", fontSize: "11px", fontWeight: 500, color: "#fff", fontFamily: "sans-serif" }}>
              <div style={{ backgroundColor: "#555", padding: "3px 8px", borderRadius: "3px 0 0 3px", textTransform: "lowercase" }}>{label}</div>
              <div style={{ backgroundColor: badgeConfig.hexColor, padding: "3px 8px", borderRadius: "0 3px 3px 0" }}>{message}</div>
            </div>
            <span style={{ fontSize: "10px", opacity: 0.4 }}>（上方为本地渲染效果，仅作示意）</span>
          </div>

          {/* Copyable snippets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.7 }}>Markdown 格式</span>
                <button
                  type="button"
                  onClick={() => copyCode("markdown", markdownCode)}
                  style={{ padding: "2px 8px", fontSize: "12px" }}
                >
                  {copied.markdown ? "已复制" : "复制"}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={markdownCode}
                style={{ fontFamily: "monospace", fontSize: "13px", padding: "8px" }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.7 }}>HTML 格式</span>
                <button
                  type="button"
                  onClick={() => copyCode("html", htmlCode)}
                  style={{ padding: "2px 8px", fontSize: "12px" }}
                >
                  {copied.html ? "已复制" : "复制"}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={htmlCode}
                style={{ fontFamily: "monospace", fontSize: "13px", padding: "8px" }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.7 }}>直接图片 URL</span>
                <button
                  type="button"
                  onClick={() => copyCode("url", badgeConfig.url)}
                  style={{ padding: "2px 8px", fontSize: "12px" }}
                >
                  {copied.url ? "已复制" : "复制"}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={badgeConfig.url}
                style={{ fontFamily: "monospace", fontSize: "13px", padding: "8px" }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
