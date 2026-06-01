"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface LinkItem {
  title: string;
  url: string;
  tag: string;
  valid: boolean;
  host: string;
}

const sampleLinks = `https://developer.mozilla.org | MDN Web Docs | docs
https://web.dev | web.dev | performance
https://owasp.org/www-project-top-ten/ | OWASP Top 10 | security`;

function parseLinks(input: string): LinkItem[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [urlPart, titlePart, tagPart] = line.split("|").map((part) => part.trim());

      try {
        const parsed = new URL(urlPart);

        return {
          title: titlePart || parsed.hostname,
          url: parsed.toString(),
          tag: tagPart || "uncategorized",
          valid: true,
          host: parsed.hostname
        };
      } catch {
        return {
          title: titlePart || urlPart,
          url: urlPart,
          tag: tagPart || "invalid",
          valid: false,
          host: "-"
        };
      }
    });
}

function groupLinks(items: LinkItem[]) {
  return items.reduce<Record<string, LinkItem[]>>((groups, item) => {
    const key = item.tag || "uncategorized";
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function toMarkdown(items: LinkItem[]) {
  const groups = groupLinks(items.filter((item) => item.valid));

  return Object.entries(groups)
    .map(([tag, links]) => [`## ${tag}`, ...links.map((link) => `- [${link.title}](${link.url}) - ${link.host}`)].join("\n"))
    .join("\n\n");
}

export default function LinkCollectionCuratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleLinks);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const links = useMemo(() => parseLinks(input), [input]);
  const validLinks = links.filter((link) => link.valid);
  const invalidLinks = links.filter((link) => !link.valid);
  const markdown = useMemo(() => toMarkdown(links), [links]);
  const json = JSON.stringify(validLinks.map(({ title, url, tag, host }) => ({ title, url, tag, host })), null, 2);
  const tags = Object.keys(groupLinks(validLinks));

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">目录</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void copy("markdown", markdown)}>{copied === "markdown" ? "已复制" : "复制 Markdown"}</button>
        <button type="button" onClick={() => void copy("json", json)}>{copied === "json" ? "已复制" : "复制 JSON"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>链接</h3><p>{links.length}</p></article>
        <article className="detail-card"><h3>有效</h3><p>{validLinks.length}</p></article>
        <article className="detail-card"><h3>无效</h3><p>{invalidLinks.length}</p></article>
        <article className="detail-card"><h3>标签</h3><p>{tags.join(", ") || "-"}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>URL | 标题 | 标签</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied("");
          }} />
        </label>
        <label className="tool-field">
          <span>Markdown 目录</span>
          <textarea value={markdown} readOnly spellCheck={false} />
        </label>
      </div>

      {invalidLinks.length > 0 ? <p className="tool-error">有 {invalidLinks.length} 条链接无法解析，请检查协议和 URL。</p> : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">链接不会发出网络请求，只做本地 URL 解析和目录整理。</p>
    </section>
  );
}
