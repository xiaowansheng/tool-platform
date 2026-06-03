"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "example.com";
  }
}

function buildMetaTags(values: {
  title: string;
  description: string;
  url: string;
  canonical: string;
  robots: string;
  siteName: string;
  image: string;
  imageAlt: string;
  keywords: string;
  author: string;
}) {
  return [
    `<title>${escapeAttribute(values.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(values.description)}">`,
    values.keywords ? `<meta name="keywords" content="${escapeAttribute(values.keywords)}">` : "",
    values.author ? `<meta name="author" content="${escapeAttribute(values.author)}">` : "",
    `<meta name="robots" content="${escapeAttribute(values.robots)}">`,
    `<link rel="canonical" href="${escapeAttribute(values.canonical || values.url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeAttribute(values.siteName)}">`,
    `<meta property="og:title" content="${escapeAttribute(values.title)}">`,
    `<meta property="og:description" content="${escapeAttribute(values.description)}">`,
    `<meta property="og:url" content="${escapeAttribute(values.url)}">`,
    values.image ? `<meta property="og:image" content="${escapeAttribute(values.image)}">` : "",
    values.image ? `<meta property="og:image:width" content="1200">` : "",
    values.image ? `<meta property="og:image:height" content="630">` : "",
    values.image ? `<meta property="og:image:alt" content="${escapeAttribute(values.imageAlt)}">` : "",
    `<meta name="twitter:card" content="${values.image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeAttribute(values.title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(values.description)}">`,
    values.image ? `<meta name="twitter:image" content="${escapeAttribute(values.image)}">` : "",
    values.image ? `<meta name="twitter:image:alt" content="${escapeAttribute(values.imageAlt)}">` : ""
  ].filter(Boolean).join("\n");
}

function scoreLength(length: number, goodMin: number, goodMax: number) {
  if (length < goodMin) {
    return "Short";
  }

  if (length > goodMax) {
    return "Long";
  }

  return "Good";
}

export default function MetaTagsSeoPreviewTool({ manifest }: ToolAppProps) {
  const [title, setTitle] = useState("Tool Platform - Developer and Design Utilities");
  const [description, setDescription] = useState("Run fast browser-based utilities for developers, designers, and product teams without leaving your workspace.");
  const [url, setUrl] = useState("https://tool-platform.local/");
  const [canonical, setCanonical] = useState("https://tool-platform.local/");
  const [siteName, setSiteName] = useState("Tool Platform");
  const [robots, setRobots] = useState("index, follow");
  const [image, setImage] = useState("https://tool-platform.local/og.png");
  const [imageAlt, setImageAlt] = useState("Tool Platform preview image");
  const [accent, setAccent] = useState("#0f766e");
  const [keywords, setKeywords] = useState("developer tools, design tools, utilities");
  const [author, setAuthor] = useState("");
  const [copied, setCopied] = useState(false);

  const trimmedImage = image.trim();
  const tagImage = useMemo(() => {
    if (trimmedImage) {
      return trimmedImage;
    }

    const base = url.trim().replace(/\/$/, "");
    return base ? `${base}/og.png` : "";
  }, [trimmedImage, url]);

  const meta = useMemo(
    () => buildMetaTags({ title, description, url, canonical, robots, siteName, image: tagImage, imageAlt, keywords, author }),
    [author, canonical, description, imageAlt, keywords, robots, siteName, tagImage, title, url]
  );

  const previewImageStyle = trimmedImage
    ? { backgroundImage: `url("${trimmedImage}")` }
    : {
        background:
          `linear-gradient(135deg, ${accent}, #101827), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.24), transparent 30%)`
      };

  async function copyMeta() {
    await navigator.clipboard.writeText(meta);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">SEO 工具</p>
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
          <span>规范链接</span>
          <input value={canonical} onChange={(event) => setCanonical(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>爬虫指令</span>
          <select value={robots} onChange={(event) => setRobots(event.target.value)}>
            <option value="index, follow">index, follow</option>
            <option value="noindex, follow">noindex, follow</option>
            <option value="index, nofollow">index, nofollow</option>
            <option value="noindex, nofollow">noindex, nofollow</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>OG 图片</span>
          <input value={image} onChange={(event) => setImage(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>图片替代文本</span>
          <input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>兜底强调色</span>
          <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>关键词</span>
          <input value={keywords} onChange={(event) => setKeywords(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>作者</span>
          <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </label>
      </div>

      <label className="tool-field">
        <span>描述</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>标题长度</h3>
          <p>{title.length} 字符 - {scoreLength(title.length, 30, 60)}</p>
        </article>
        <article className="detail-card">
          <h3>描述长度</h3>
          <p>{description.length} 字符 - {scoreLength(description.length, 70, 160)}</p>
        </article>
        <article className="detail-card">
          <h3>收录状态</h3>
          <p>{robots.includes("noindex") ? "不收录" : "可收录"}</p>
        </article>
      </div>

      <div className="asset-preview-grid">
        <article className="serp-preview">
          <cite>{hostFromUrl(url)} › tools</cite>
          <h3>{title}</h3>
          <p>{description}</p>
        </article>
        {["Facebook", "LinkedIn", "X Large Image"].map((platform) => (
          <article key={platform} className="og-card">
            <div className="og-card__image" style={previewImageStyle}>
              {!trimmedImage ? <strong>{siteName}</strong> : null}
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
        <span>Meta 标签</span>
        <textarea value={meta} readOnly spellCheck={false} />
      </label>

      <button type="button" onClick={() => void copyMeta()}>{copied ? "已复制" : "复制 Meta 标签"}</button>
    </section>
  );
}
