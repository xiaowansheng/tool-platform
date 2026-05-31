"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const colors = ["brightgreen", "green", "yellowgreen", "yellow", "orange", "red", "blue", "lightgrey", "success", "important", "informational"];
const styles = ["flat", "flat-square", "plastic", "for-the-badge", "social"];

function encodeBadgeSegment(value: string) {
  return encodeURIComponent(value.trim().replace(/-/g, "--").replace(/_/g, "__") || "badge");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildBadgeUrl(label: string, message: string, color: string, style: string, logo: string) {
  const normalizedColor = color.trim().replace(/^#/, "") || "blue";
  const params = new URLSearchParams();

  if (style) {
    params.set("style", style);
  }

  if (logo.trim()) {
    params.set("logo", logo.trim());
  }

  const query = params.toString();
  return `https://img.shields.io/badge/${encodeBadgeSegment(label)}-${encodeBadgeSegment(message)}-${encodeURIComponent(normalizedColor)}${query ? `?${query}` : ""}`;
}

export default function ReadmeBadgeGeneratorTool({ manifest }: ToolClientProps) {
  const [label, setLabel] = useState("build");
  const [message, setMessage] = useState("passing");
  const [color, setColor] = useState("brightgreen");
  const [style, setStyle] = useState("flat-square");
  const [logo, setLogo] = useState("githubactions");
  const [link, setLink] = useState("https://github.com/example/project/actions");
  const [copied, setCopied] = useState(false);
  const badgeUrl = buildBadgeUrl(label, message, color, style, logo);
  const markdown = link.trim() ? `[![${label}](${badgeUrl})](${link.trim()})` : `![${label}](${badgeUrl})`;
  const html = link.trim()
    ? `<a href="${escapeHtml(link.trim())}"><img alt="${escapeHtml(label)}" src="${escapeHtml(badgeUrl)}"></a>`
    : `<img alt="${escapeHtml(label)}" src="${escapeHtml(badgeUrl)}">`;

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">README 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>标签</span>
          <input value={label} onChange={(event) => {
            setLabel(event.target.value);
            setCopied(false);
          }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>状态文本</span>
          <input value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>颜色</span>
          <select value={color} onChange={(event) => setColor(event.target.value)}>
            {colors.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>样式</span>
          <select value={style} onChange={(event) => setStyle(event.target.value)}>
            {styles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>图标</span>
            <input value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="simple-icons 名称" />
          </label>
          <label className="tool-field">
            <span>链接</span>
            <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="可选跳转链接" />
          </label>
          <div className="detail-card">
            <h3>预览</h3>
            <p>
              <img src={badgeUrl} alt={`${label} badge`} />
            </p>
          </div>
        </div>
        <div className="workspace workspace--stack">
          <button type="button" onClick={() => void copyMarkdown()}>{copied ? "已复制" : "复制 Markdown"}</button>
          <label className="tool-field">
            <span>Markdown</span>
            <textarea value={markdown} readOnly spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>HTML</span>
            <textarea value={html} readOnly spellCheck={false} />
          </label>
        </div>
      </div>
    </section>
  );
}
