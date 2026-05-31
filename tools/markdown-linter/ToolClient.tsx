"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface MarkdownIssue {
  line: number;
  rule: string;
  severity: "error" | "warning";
  message: string;
}

const sampleMarkdown = [
  "Tool Platform",
  "",
  "### Quick start",
  "Install dependencies and run the app.",
  "",
  "```",
  "pnpm install",
  "pnpm dev",
  "```",
  "",
  "- JSON Formatter",
  "- Regex Tester",
  "",
  "",
  "## Usage",
  "Paste input into a tool and copy the output."
].join("\n");

function lintMarkdown(markdown: string, lineWidth: number) {
  const lines = markdown.split(/\r?\n/);
  const issues: MarkdownIssue[] = [];
  let blankRun = 0;
  let inFence = false;
  let previousHeadingLevel = 0;
  let h1Count = 0;

  const firstNonEmptyIndex = lines.findIndex((line) => line.trim() !== "");

  if (firstNonEmptyIndex >= 0 && !/^#\s+/.test(lines[firstNonEmptyIndex] ?? "")) {
    issues.push({ line: firstNonEmptyIndex + 1, rule: "MD041", severity: "warning", message: "文档应以一级标题开头。" });
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (/[ \t]+$/.test(line)) {
      issues.push({ line: lineNumber, rule: "MD009", severity: "warning", message: "行尾存在多余空格。" });
    }

    if (trimmed === "") {
      blankRun += 1;

      if (blankRun > 1) {
        issues.push({ line: lineNumber, rule: "MD012", severity: "warning", message: "连续空行超过 1 行。" });
      }

      return;
    }

    blankRun = 0;

    if (/^```/.test(trimmed)) {
      if (!inFence && trimmed === "```") {
        issues.push({ line: lineNumber, rule: "MD040", severity: "warning", message: "代码块缺少语言标识。" });
      }

      inFence = !inFence;
      return;
    }

    if (!inFence && line.length > lineWidth && !/^\s*\|/.test(line)) {
      issues.push({ line: lineNumber, rule: "MD013", severity: "warning", message: "行宽超过 " + lineWidth + " 个字符。" });
    }

    const missingHeadingSpace = line.match(/^(#{1,6})(\S.*)$/);

    if (missingHeadingSpace) {
      issues.push({ line: lineNumber, rule: "MD018", severity: "error", message: "标题井号后需要空格。" });
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);

    if (heading) {
      const level = heading[1]?.length ?? 1;
      const title = heading[2] ?? "";

      if (level === 1) {
        h1Count += 1;
      }

      if (previousHeadingLevel > 0 && level > previousHeadingLevel + 1) {
        issues.push({ line: lineNumber, rule: "MD001", severity: "error", message: "标题层级一次只能递增一级。" });
      }

      if (index > 0 && (lines[index - 1] ?? "").trim() !== "") {
        issues.push({ line: lineNumber, rule: "MD022", severity: "warning", message: "标题前应保留空行。" });
      }

      if (index < lines.length - 1 && (lines[index + 1] ?? "").trim() !== "") {
        issues.push({ line: lineNumber, rule: "MD022", severity: "warning", message: "标题后应保留空行。" });
      }

      if (/[.,;:!?。！？：；]$/.test(title)) {
        issues.push({ line: lineNumber, rule: "MD026", severity: "warning", message: "标题末尾建议移除标点。" });
      }

      previousHeadingLevel = level;
    }

    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      if (index > 0 && (lines[index - 1] ?? "").trim() !== "" && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index - 1] ?? "")) {
        issues.push({ line: lineNumber, rule: "MD032", severity: "warning", message: "列表前应保留空行。" });
      }

      if (index < lines.length - 1 && (lines[index + 1] ?? "").trim() !== "" && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index + 1] ?? "")) {
        issues.push({ line: lineNumber, rule: "MD032", severity: "warning", message: "列表后应保留空行。" });
      }
    }
  });

  if (h1Count > 1) {
    issues.push({ line: 1, rule: "MD025", severity: "warning", message: "文档中存在多个一级标题。" });
  }

  if (markdown.length > 0 && !markdown.endsWith("\n")) {
    issues.push({ line: lines.length, rule: "MD047", severity: "warning", message: "文件末尾应保留一个换行。" });
  }

  return issues;
}

function autoFixMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const fixedLines: string[] = [];
  let blankRun = 0;
  let inFence = false;

  for (const rawLine of lines) {
    let line = rawLine.replace(/[ \t]+$/g, "");
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      if (!inFence && trimmed === "```") {
        line = "```text";
      }

      inFence = !inFence;
    }

    if (trimmed === "") {
      blankRun += 1;

      if (blankRun <= 1) {
        fixedLines.push("");
      }

      continue;
    }

    blankRun = 0;
    fixedLines.push(line);
  }

  return fixedLines.join("\n").trimEnd() + "\n";
}

export default function MarkdownLinterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleMarkdown);
  const [lineWidth, setLineWidth] = useState(100);
  const [copied, setCopied] = useState(false);
  const issues = lintMarkdown(input, lineWidth);
  const fixed = autoFixMarkdown(input);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;

  async function copyFixed() {
    await navigator.clipboard.writeText(fixed);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文档质量</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>最大行宽</span>
          <input type="number" min="60" max="160" value={lineWidth} onChange={(event) => setLineWidth(Number(event.target.value))} />
        </label>
        <button type="button" className="button--primary" onClick={() => { setInput(fixed); setCopied(false); }}>应用自动修复</button>
        <button type="button" onClick={() => void copyFixed()}>{copied ? "已复制修复结果" : "复制修复结果"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>错误</h3>
          <p>{errorCount}</p>
        </article>
        <article className="detail-card">
          <h3>警告</h3>
          <p>{warningCount}</p>
        </article>
        <article className="detail-card">
          <h3>行数</h3>
          <p>{input.split(/\r?\n/).length}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Markdown 输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>自动修复预览</span>
          <textarea value={fixed} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>规则</span>
          <span>问题</span>
        </div>
        {issues.length > 0 ? issues.map((issue) => (
          <div className="tool-table__row" key={issue.line + "-" + issue.rule + "-" + issue.message}>
            <span>{issue.rule} / L{issue.line}</span>
            <span>{issue.severity === "error" ? "错误" : "警告"}：{issue.message}</span>
          </div>
        )) : (
          <div className="tool-table__row">
            <span>OK</span>
            <span>未发现 Markdown 规范问题</span>
          </div>
        )}
      </div>
    </section>
  );
}
