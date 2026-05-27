"use client";

import { useState, type ReactNode } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type MarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "code"; language: string; text: string }
  | { kind: "quote"; text: string };

const sampleMarkdown = `# Tool Platform

浏览器中的工具工作台，支持 **插件化**、Worker 和 WASM。

- JSON / Regex / Base64
- 文本分析与本地缓存
- 未来扩展 AI 工具

> 工具应该是独立模块，而不是普通页面。

\`\`\`ts
export interface ToolManifest {
  id: string;
  runtime: "simple" | "worker" | "wasm";
}
\`\`\``;

function flushParagraph(blocks: MarkdownBlock[], paragraph: string[]) {
  if (paragraph.length > 0) {
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph.length = 0;
  }
}

function parseMarkdown(markdown: string) {
  const blocks: MarkdownBlock[] = [];
  const paragraph: string[] = [];
  const lines = markdown.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph(blocks, paragraph);
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```(\w+)?$/);

    if (fence) {
      flushParagraph(blocks, paragraph);
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !/^```$/.test((lines[index] ?? "").trim())) {
        code.push(lines[index] ?? "");
        index += 1;
      }

      blocks.push({ kind: "code", language: fence[1] ?? "text", text: code.join("\n") });
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      flushParagraph(blocks, paragraph);
      blocks.push({ kind: "heading", level: heading[1]?.length ?? 1, text: heading[2] ?? "" });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(blocks, paragraph);
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }

      blocks.push({ kind: "list", items });
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph(blocks, paragraph);
      blocks.push({ kind: "quote", text: trimmed.replace(/^>\s?/, "") });
      index += 1;
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph(blocks, paragraph);

  return blocks;
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return parts.map((part, index): ReactNode => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (link) {
      const href = link[2] ?? "";
      const safeHref = /^https?:\/\//.test(href) ? href : "#";

      return (
        <a key={index} href={safeHref} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }

    return part;
  });
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.kind === "heading") {
    const Heading = `h${block.level}` as "h1" | "h2" | "h3";

    return <Heading key={index}>{renderInline(block.text)}</Heading>;
  }

  if (block.kind === "list") {
    return (
      <ul key={index}>
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.kind === "code") {
    return (
      <pre key={index}>
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.kind === "quote") {
    return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
  }

  return <p key={index}>{renderInline(block.text)}</p>;
}

export default function MarkdownPreviewTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleMarkdown);
  const blocks = parseMarkdown(input);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Text Workspace</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Markdown</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <article className="detail-card markdown-preview" aria-label="Markdown preview">
          {blocks.length > 0 ? blocks.map(renderBlock) : <p>暂无内容</p>}
        </article>
      </div>
    </section>
  );
}
