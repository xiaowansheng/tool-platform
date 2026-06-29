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

// Regex HTML Meta parser
function parseMetaFromHtml(html: string) {
  const matchReg = (regex: RegExp): string => {
    const match = html.match(regex);
    return match && match[1] ? match[1].trim() : "";
  };

  const title = matchReg(/<title[^>]*>([\s\S]*?)<\/title>/i);

  // Description
  let description = matchReg(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
                    matchReg(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
  if (!description) {
    description = matchReg(/<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i);
  }

  // Keywords
  const keywords = matchReg(/<meta[^>]+name=["']keywords["'][^>]+content=["']([\s\S]*?)["']/i) ||
                    matchReg(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']keywords["']/i);

  // Author
  const author = matchReg(/<meta[^>]+name=["']author["'][^>]+content=["']([\s\S]*?)["']/i);

  // Robots
  const robots = matchReg(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["']/i);

  // Canonical
  const canonical = matchReg(/<link[^>]+rel=["']canonical["'][^>]+href=["']([\s\S]*?)["']/i) ||
                    matchReg(/<link[^>]+href=["']([\s\S]*?)["'][^>]+rel=["']canonical["']/i);

  // OG Image
  let ogImage = matchReg(/<meta[^>]+property=["']og:image["'][^>]+content=["']([\s\S]*?)["']/i) ||
                 matchReg(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+property=["']og:image["']/i);
  if (!ogImage) {
    ogImage = matchReg(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([\s\S]*?)["']/i);
  }

  // Site Name
  const siteName = matchReg(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([\s\S]*?)["']/i);

  return { title, description, keywords, author, robots, canonical, ogImage, siteName };
}

export default function MetaTagsSeoPreviewTool({ manifest }: ToolAppProps) {
  // Tabs: generate (manual fill) / scan (online URL scanner)
  const [activeTab, setActiveTab] = useState<"scan" | "generate">("scan");
  const [scanUrl, setScanUrl] = useState("https://github.com");

  // State values for generated tags
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

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  // Online SEO live scanner method
  const handleScanLiveUrl = async () => {
    if (!scanUrl.trim()) {
      setError("请输入目标 URL 或是网址");
      return;
    }

    let targetUrl = scanUrl.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/http-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          method: "GET"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `请求失败，状态码: ${response.status}`);
      }

      const parsed = parseMetaFromHtml(data.body);

      // Autofill forms
      setTitle(parsed.title || hostFromUrl(targetUrl));
      setDescription(parsed.description || "未检测到描述信息。");
      setUrl(targetUrl);
      setCanonical(parsed.canonical || targetUrl);
      setSiteName(parsed.siteName || hostFromUrl(targetUrl));
      if (parsed.robots) setRobots(parsed.robots);
      setImage(parsed.ogImage || "");
      setKeywords(parsed.keywords || "");
      setAuthor(parsed.author || "");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取网页失败，请确认域名和网络连接");
    } finally {
      setBusy(false);
    }
  };

  async function copyMeta() {
    await navigator.clipboard.writeText(meta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">SEO 标签预览</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "获取线上任意网页的 SEO Meta 标签并生成搜索引擎与社交卡片分享效果预览，或手动在线生成 Meta HTML 代码。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "scan" ? "active" : ""} onClick={() => { setActiveTab("scan"); setError(""); }}>
          在线分析真实网页 (Scan URL)
        </button>
        <button type="button" className={activeTab === "generate" ? "active" : ""} onClick={() => { setActiveTab("generate"); setError(""); }}>
          手动填写/生成 (Manual Generator)
        </button>
      </div>

      {activeTab === "scan" ? (
        <div className="tool-toolbar tool-toolbar--grid" style={{ marginBottom: "1.25rem" }}>
          <label className="tool-field" style={{ flex: 1 }}>
            <span>目标网页 URL</span>
            <input 
              value={scanUrl} 
              onChange={e => setScanUrl(e.target.value)} 
              placeholder="https://github.com"
              style={{ height: "36px" }}
            />
          </label>
          <button 
            type="button" 
            className="button--primary" 
            onClick={handleScanLiveUrl} 
            disabled={busy}
            style={{ height: "36px", alignSelf: "end", padding: "0 1.5rem" }}
          >
            {busy ? "抓取分析中..." : "在线分析"}
          </button>
        </div>
      ) : (
        <div className="tool-toolbar" style={{ marginBottom: "1.25rem" }}>
          <button type="button" onClick={() => {
            setTitle("Tool Platform - Developer and Design Utilities");
            setDescription("Run fast browser-based utilities for developers, designers, and product teams without leaving your workspace.");
            setUrl("https://tool-platform.local/");
            setCanonical("https://tool-platform.local/");
            setImage("https://tool-platform.local/og.png");
            setKeywords("developer tools, design tools, utilities");
            setError("");
          }}>
            重置为默认数据
          </button>
        </div>
      )}

      {/* Editor Panel Configuration Form */}
      <div className="tool-toolbar tool-toolbar--grid" style={{ marginTop: "1rem" }}>
        <label className="tool-field tool-field--compact">
          <span>网页标题 (Title)</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>站点名称 (Site Name)</span>
          <input value={siteName} onChange={(event) => setSiteName(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>当前页面 URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>规范链接 (Canonical Link)</span>
          <input value={canonical} onChange={(event) => setCanonical(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>搜索引擎收录指令</span>
          <select value={robots} onChange={(event) => setRobots(event.target.value)}>
            <option value="index, follow">index, follow (允许索引和追踪)</option>
            <option value="noindex, follow">noindex, follow (不收录, 允许追踪)</option>
            <option value="index, nofollow">index, nofollow (收录, 禁止追踪)</option>
            <option value="noindex, nofollow">noindex, nofollow (全面禁止)</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>分享缩略图 (OG Image URL)</span>
          <input value={image} onChange={(event) => setImage(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>图片 Alt 描述</span>
          <input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>无图时的強調兜底色</span>
          <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Meta 关键词 (Keywords)</span>
          <input value={keywords} onChange={(event) => setKeywords(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>文章作者 (Author)</span>
          <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </label>
      </div>

      <label className="tool-field" style={{ marginTop: "1rem" }}>
        <span>页面描述 (Meta Description)</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
      </label>

      {/* Metrics Indicators */}
      <div className="detail-grid" style={{ marginTop: "1.25rem" }}>
        <article className="detail-card">
          <h3>标题长度</h3>
          <p style={{ color: scoreLength(title.length, 30, 60) === "Good" ? "#22c55e" : "#eab308" }}>
            {title.length} 字符 - {scoreLength(title.length, 30, 60) === "Good" ? "合适 (Good)" : scoreLength(title.length, 30, 60) === "Short" ? "偏短 (Short)" : "偏长 (Long)"}
          </p>
        </article>
        <article className="detail-card">
          <h3>描述长度</h3>
          <p style={{ color: scoreLength(description.length, 70, 160) === "Good" ? "#22c55e" : "#eab308" }}>
            {description.length} 字符 - {scoreLength(description.length, 70, 160) === "Good" ? "合适 (Good)" : scoreLength(description.length, 70, 160) === "Short" ? "偏短 (Short)" : "偏长 (Long)"}
          </p>
        </article>
        <article className="detail-card">
          <h3>爬虫收录状态</h3>
          <p style={{ fontWeight: "600", color: robots.includes("noindex") ? "#ef4444" : "#22c55e" }}>
            {robots.includes("noindex") ? "阻断收录 (noindex)" : "允许收录 (index)"}
          </p>
        </article>
      </div>

      {/* Live SERP and Social previews */}
      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>社交分享与搜寻预览效果 (Social & Search Cards Preview)</h3>
      <div className="asset-preview-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        <article className="serp-preview" style={{ border: "1px solid var(--border-default)", padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)" }}>
          <cite style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{hostFromUrl(url)} › home</cite>
          <h3 style={{ color: "#1a0dab", margin: "0.25rem 0", fontSize: "1.05rem" }}>{title}</h3>
          <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{description}</p>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.25rem", display: "block" }}>Google SERP 预览</small>
        </article>
        {["Facebook", "LinkedIn", "X (Twitter) Large Image"].map((platform) => (
          <article key={platform} className="og-card" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--bg-subtle)" }}>
            <div className="og-card__image" style={{ 
              height: "140px", 
              backgroundPosition: "center", 
              backgroundSize: "cover", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              ...previewImageStyle 
            }}>
              {!trimmedImage ? <strong style={{ color: "#ffffff", background: "rgba(0,0,0,0.5)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>{siteName}</strong> : null}
            </div>
            <div className="og-card__body" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{hostFromUrl(url)}</span>
              <h3 style={{ fontSize: "0.9rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: 0, lineHeight: 1.35 }}>{description}</p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.25rem" }}>{platform} 分享卡</small>
            </div>
          </article>
        ))}
      </div>

      {/* Generated Meta Tags output */}
      <label className="tool-field" style={{ marginTop: "1.5rem" }}>
        <span>生成的 Meta HTML 代码标签</span>
        <textarea 
          value={meta} 
          readOnly 
          spellCheck={false} 
          rows={8}
          style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem", background: "var(--bg-muted)", lineHeight: 1.4 }}
        />
      </label>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button type="button" className="button--primary" onClick={copyMeta}>{copied ? "已复制" : "复制 Meta HTML 代码"}</button>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
