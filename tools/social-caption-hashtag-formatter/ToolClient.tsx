"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Platform = "x" | "linkedin" | "instagram" | "tiktok";

const limits: Record<Platform, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200
};

function cleanHashtag(value: string) {
  const cleaned = value.trim().replace(/^#/, "").replace(/[^\p{L}\p{N}_]+/gu, "");
  return cleaned ? `#${cleaned}` : "";
}

function buildCaption(platform: Platform, body: string, cta: string, hashtags: string[], url: string) {
  const lines = [body.trim(), cta.trim(), url.trim()].filter(Boolean);
  const tags = hashtags.map(cleanHashtag).filter(Boolean);
  const tagLimit = platform === "x" ? 3 : platform === "linkedin" ? 5 : 12;

  return [...lines, tags.slice(0, tagLimit).join(" ")].filter(Boolean).join("\n\n");
}

export default function SocialCaptionHashtagFormatterTool({ manifest }: ToolClientProps) {
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [body, setBody] = useState("We shipped a practical browser tool collection for developers, operators, and creators.");
  const [cta, setCta] = useState("Try it and tell us what workflow we should add next.");
  const [hashtagsText, setHashtagsText] = useState("devtools, productivity, webdev, opensource, tooling");
  const [url, setUrl] = useState("https://example.com?utm_source=social&utm_medium=post&utm_campaign=tool_launch");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const hashtags = useMemo(() => hashtagsText.split(/,|\s+/).map((item) => item.trim()).filter(Boolean), [hashtagsText]);
  const caption = useMemo(() => buildCaption(platform, body, cta, hashtags, url), [body, cta, hashtags, platform, url]);
  const remaining = limits[platform] - caption.length;
  const variants = (Object.keys(limits) as Platform[]).map((item) => ({
    platform: item,
    caption: buildCaption(item, body, cta, hashtags, url)
  }));

  async function copyCaption(value = caption) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Social Publishing</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>平台</span>
          <select value={platform} onChange={(event) => setPlatform(event.target.value as Platform)}>
            <option value="x">X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
        </label>
        <button type="button" onClick={() => void copyCaption()}>{copied ? "已复制" : "复制当前版本"}</button>
        <div className="mono-output">{caption.length} / {limits[platform]} chars</div>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>正文</span><textarea value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <label className="tool-field"><span>CTA</span><input value={cta} onChange={(event) => setCta(event.target.value)} /></label>
          <label className="tool-field"><span>Hashtags</span><input value={hashtagsText} onChange={(event) => setHashtagsText(event.target.value)} /></label>
          <label className="tool-field"><span>URL</span><input value={url} onChange={(event) => setUrl(event.target.value)} /></label>
        </div>

        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>当前平台文案</span>
            <textarea value={caption} readOnly spellCheck={false} />
          </label>
          {remaining < 0 ? <p className="tool-error">超过平台建议长度 {Math.abs(remaining)} 个字符。</p> : null}
          {variants.map((variant) => (
            <article className="detail-card" key={variant.platform}>
              <h3>{variant.platform.toUpperCase()} · {variant.caption.length}/{limits[variant.platform]}</h3>
              <p>{variant.caption.slice(0, 180)}{variant.caption.length > 180 ? "..." : ""}</p>
              <button type="button" onClick={() => void copyCaption(variant.caption)}>复制</button>
            </article>
          ))}
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">不同平台的实际截断规则会变化；发布前仍建议在原平台预览链接卡片和换行效果。</p>
    </section>
  );
}
