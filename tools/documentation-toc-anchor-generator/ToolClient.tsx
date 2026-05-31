"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface HeadingInfo {
  line: number;
  depth: number;
  text: string;
  anchor: string;
  number: string;
}

const sampleDocument = `# Tool Platform

## Architecture

### Runtime registry

### Tool packages

## Development

### Create a tool

### Run checks

## Release Notes`;

function cleanHeadingText(value: string) {
  return value
    .replace(/\s+#+\s*$/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

function githubAnchor(value: string) {
  return cleanHeadingText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-") || "section";
}

function parseHeadings(markdown: string, includeH1: boolean, maxDepth: number) {
  const seen = new Map<string, number>();
  const counters = [0, 0, 0, 0, 0, 0, 0];
  const headings: HeadingInfo[] = [];

  markdown.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (!match) {
      return;
    }

    const depth = match[1]?.length ?? 1;
    const text = cleanHeadingText(match[2] ?? "");

    if ((!includeH1 && depth === 1) || depth > maxDepth || /toc:(start|end)/i.test(text)) {
      return;
    }

    const baseAnchor = githubAnchor(text);
    const count = seen.get(baseAnchor) ?? 0;
    seen.set(baseAnchor, count + 1);
    counters[depth] += 1;

    for (let currentDepth = depth + 1; currentDepth < counters.length; currentDepth += 1) {
      counters[currentDepth] = 0;
    }

    headings.push({
      line: index + 1,
      depth,
      text,
      anchor: count === 0 ? baseAnchor : `${baseAnchor}-${count}`,
      number: counters.slice(1, depth + 1).filter((item) => item > 0).join(".")
    });
  });

  return headings;
}

function buildToc(headings: HeadingInfo[], numbered: boolean) {
  if (headings.length === 0) {
    return "";
  }

  const minDepth = Math.min(...headings.map((heading) => heading.depth));

  return headings
    .map((heading) => {
      const indent = "  ".repeat(Math.max(0, heading.depth - minDepth));
      const label = numbered ? `${heading.number} ${heading.text}` : heading.text;

      return `${indent}- [${label}](#${heading.anchor})`;
    })
    .join("\n");
}

function insertToc(markdown: string, toc: string) {
  const tocBlock = `<!-- toc:start -->\n${toc}\n<!-- toc:end -->`;

  if (/<!-- toc:start -->[\s\S]*?<!-- toc:end -->/i.test(markdown)) {
    return markdown.replace(/<!-- toc:start -->[\s\S]*?<!-- toc:end -->/i, tocBlock);
  }

  const lines = markdown.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));

  if (titleIndex >= 0) {
    lines.splice(titleIndex + 1, 0, "", tocBlock);
    return lines.join("\n");
  }

  return `${tocBlock}\n\n${markdown}`;
}

export default function DocumentationTocAnchorGeneratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleDocument);
  const [includeH1, setIncludeH1] = useState(false);
  const [numbered, setNumbered] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);
  const [copied, setCopied] = useState(false);
  const headings = parseHeadings(input, includeH1, maxDepth);
  const toc = buildToc(headings, numbered);
  const documentWithToc = insertToc(input, toc);

  async function copyToc() {
    await navigator.clipboard.writeText(toc);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Markdown 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={includeH1} onChange={(event) => setIncludeH1(event.target.checked)} />
          <span>包含 H1</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={numbered} onChange={(event) => setNumbered(event.target.checked)} />
          <span>编号目录</span>
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大层级</span>
          <select value={maxDepth} onChange={(event) => setMaxDepth(Number(event.target.value))}>
            {[2, 3, 4, 5, 6].map((depth) => <option key={depth} value={depth}>H{depth}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void copyToc()}>{copied ? "已复制" : "复制目录"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Markdown</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>带 TOC 标记的文档</span>
          <textarea value={documentWithToc} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>目录</span>
          <textarea value={toc} readOnly spellCheck={false} />
        </label>
        <div className="tool-table">
          <div className="tool-table__row tool-table__row--head">
            <span>锚点</span>
            <span>标题</span>
          </div>
          {headings.length > 0 ? headings.map((heading) => (
            <div className="tool-table__row" key={`${heading.line}-${heading.anchor}`}>
              <span>#{heading.anchor}</span>
              <span>H{heading.depth} 第 {heading.line} 行：{heading.text}</span>
            </div>
          )) : (
            <div className="tool-table__row">
              <span>无</span>
              <span>未找到匹配层级的 Markdown 标题</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
