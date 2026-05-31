"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function hostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "example.com";
  }
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function buildTags(title: string, description: string, url: string, image: string, siteName: string, imageAlt: string) {
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeAttribute(siteName)}">`,
    `<meta property="og:title" content="${escapeAttribute(title)}">`,
    `<meta property="og:description" content="${escapeAttribute(description)}">`,
    `<meta property="og:url" content="${escapeAttribute(url)}">`,
    `<meta property="og:image" content="${escapeAttribute(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeAttribute(imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
    `<meta name="twitter:image" content="${escapeAttribute(image)}">`
  ].join("\n");
}

export default function OpenGraphPreviewTool({ manifest }: ToolClientProps) {
  const [title, setTitle] = useState("高效构建内部工具");
  const [description, setDescription] = useState("一个聚合格式化、生成、校验和设计调试工具的浏览器工作台。");
  const [url, setUrl] = useState("https://tool-platform.local/tools/open-graph-preview");
  const [siteName, setSiteName] = useState("工具平台");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("工具平台预览图");
  const [accent, setAccent] = useState("#0f766e");
  const [copied, setCopied] = useState(false);

  const tags = useMemo(() => buildTags(title, description, url, imageUrl || `${url.replace(/\/$/, "")}/og.png`, siteName, imageAlt), [
    description,
    imageAlt,
    imageUrl,
    siteName,
    title,
    url
  ]);

  const previewImageStyle = imageUrl.trim()
    ? { backgroundImage: `url("${imageUrl}")` }
    : {
        background:
          `linear-gradient(135deg, ${accent}, #101827), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25), transparent 30%)`
      };

  async function copyTags() {
    await navigator.clipboard.writeText(tags);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">社交预览</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>站点名称</span>
          <input value={siteName} onChange={(event) => setSiteName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>图片 URL</span>
          <input value={imageUrl} placeholder="https://..." onChange={(event) => setImageUrl(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>图片替代文本</span>
          <input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>兜底强调色</span>
          <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
        </label>
      </div>

      <label className="tool-field">
        <span>描述</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className="asset-preview-grid">
        {["Facebook", "LinkedIn", "X 大图卡片"].map((platform) => (
          <article key={platform} className="og-card">
            <div className="og-card__image" style={previewImageStyle}>
              {!imageUrl.trim() ? <strong>{siteName}</strong> : null}
            </div>
            <div className="og-card__body">
              <span>{hostFromUrl(url)}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>{platform}</small>
            </div>
          </article>
        ))}
      </div>

      <label className="tool-field">
        <span>Open Graph / Twitter 标签</span>
        <textarea value={tags} readOnly spellCheck={false} />
      </label>

      <button type="button" onClick={() => void copyTags()}>{copied ? "已复制" : "复制标签"}</button>
    </section>
  );
}
