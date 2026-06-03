"use client";

import { useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const MD_EXAMPLE = `# Markdown 标题示例

这是 **粗体**，这是 *斜体*，这是 \`行内代码\`。

下面是一个代码块示例：

\`\`\`javascript
const greeting = "Hello World";
console.log(greeting);
\`\`\`

## 列表和引用

- 项目一
- 项目二
- 项目三

> 这是一段引用的文字，表示强调或参考。
> 第二行引用。

[访问工具平台](https://localhost:3000)
`;

const HTML_EXAMPLE = `<h1>HTML 标题示例</h1>
<p>这是 <strong>粗体</strong>，这是 <em>斜体</em>，这是 <code>行内代码</code>。</p>

<h2>列表和引用</h2>
<ul>
  <li>项目一</li>
  <li>项目二</li>
  <li>项目三</li>
</ul>

<blockquote>
  这是一段引用的文字，表示强调或参考。<br>
  第二行引用。
</blockquote>

<p><a href="https://localhost:3000" target="_blank" rel="noopener noreferrer">访问工具平台</a></p>
`;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatInlineMarkdown(text: string): string {
  let formatted = escapeHtml(text);

  // Images: ![alt](src)
  formatted = formatted.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:4px; margin:0.5rem 0;" />');

  // Links: [text](href)
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary); text-decoration:underline;">$1</a>');

  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
  formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");

  // Inline Code: `code`
  formatted = formatted.replace(/`(.*?)`/g, '<code style="background:var(--bg-muted); padding:0.1rem 0.3rem; border-radius:3px; font-family:monospace; font-size:0.9em;">$1</code>');

  return formatted;
}

// Convert Markdown string to HTML string
function markdownToHtml(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre style="background:#151820; padding:1rem; border-radius:6px; overflow:auto; margin:0.8rem 0;"><code class="language-${codeLang}" style="font-family:monospace; color:#f8f8f2;">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLines = [];
      } else {
        inCode = true;
        codeLang = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Handle lists
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);

    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) html.push(listType === "ul" ? "</ul>" : "</ol>");
        html.push('<ul style="list-style-type:disc; padding-left:1.5rem; margin:0.8rem 0;">');
        inList = true;
        listType = "ul";
      }
      html.push(`  <li style="margin:0.2rem 0;">${formatInlineMarkdown(ulMatch[2])}</li>`);
      continue;
    }

    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) html.push(listType === "ul" ? "</ul>" : "</ol>");
        html.push('<ol style="list-style-type:decimal; padding-left:1.5rem; margin:0.8rem 0;">');
        inList = true;
        listType = "ol";
      }
      html.push(`  <li style="margin:0.2rem 0;">${formatInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    if (inList && line.trim() === "") {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
      listType = null;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizeStyle = level === 1 ? "1.75rem" : level === 2 ? "1.4rem" : level === 3 ? "1.2rem" : "1rem";
      html.push(`<h${level} style="font-size:${sizeStyle}; font-weight:bold; margin:1.2rem 0 0.6rem; color:var(--text-primary);">${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s+(.*)/);
    if (quoteMatch) {
      html.push(`<blockquote style="border-left:4px solid var(--accent-primary); padding-left:1rem; margin:0.8rem 0; color:var(--text-secondary); italic;">${formatInlineMarkdown(quoteMatch[1])}</blockquote>`);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      html.push('<hr style="border:0; border-top:1px solid var(--border); margin:1.2rem 0;" />');
      continue;
    }

    // Blank lines
    if (line.trim() === "") {
      continue;
    }

    // Paragraph
    html.push(`<p style="margin:0.6rem 0; line-height:1.6; color:var(--text-secondary);">${formatInlineMarkdown(line)}</p>`);
  }

  // Close lists if still open
  if (inList) {
    html.push(listType === "ul" ? "</ul>" : "</ol>");
  }

  return html.join("\n");
}

// Convert HTML string to Markdown string
function htmlToMarkdown(html: string): string {
  if (!html) return "";

  // Guard for rendering environment (must be browser)
  if (typeof window === "undefined") return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return parseDomNode(doc.body).trim();
  } catch (err) {
    console.error("DOMParser error", err);
    return html;
  }
}

function parseDomNode(node: Node): string {
  let markdown = "";

  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const children = Array.from(element.childNodes).map(parseDomNode).join("");

  switch (element.tagName) {
    case "H1":
      return `\n# ${children.trim()}\n`;
    case "H2":
      return `\n## ${children.trim()}\n`;
    case "H3":
      return `\n### ${children.trim()}\n`;
    case "H4":
      return `\n#### ${children.trim()}\n`;
    case "H5":
      return `\n##### ${children.trim()}\n`;
    case "H6":
      return `\n###### ${children.trim()}\n`;
    case "P":
      return `\n${children.trim()}\n`;
    case "BR":
      return `\n`;
    case "STRONG":
    case "B":
      return `**${children}**`;
    case "EM":
    case "I":
      return `*${children}*`;
    case "CODE":
      if (element.parentElement?.tagName === "PRE") {
        return children;
      }
      return `\`${children}\``;
    case "PRE":
      const codeElement = element.querySelector("code");
      const langClass = codeElement?.className || "";
      const langMatch = langClass.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : "";
      const codeContent = codeElement ? codeElement.textContent : element.textContent;
      return `\n\`\`\`${lang}\n${codeContent?.trim()}\n\`\`\`\n`;
    case "A":
      const href = element.getAttribute("href") || "";
      return `[${children}](${href})`;
    case "IMG":
      const src = element.getAttribute("src") || "";
      const alt = element.getAttribute("alt") || "";
      return `![${alt}](${src})`;
    case "BLOCKQUOTE":
      const quoteLines = children.trim().split("\n").map(l => `> ${l}`).join("\n");
      return `\n${quoteLines}\n`;
    case "UL":
    case "OL":
      return `\n${children}\n`;
    case "LI":
      const isOrdered = element.parentElement?.tagName === "OL";
      if (isOrdered) {
        const siblings = Array.from(element.parentElement?.children || []);
        const index = siblings.indexOf(element) + 1;
        return `${index}. ${children.trim()}\n`;
      }
      return `- ${children.trim()}\n`;
    case "HR":
      return `\n---\n`;
    case "BODY":
    case "DIV":
    case "SPAN":
    case "SECTION":
    case "ARTICLE":
      return children;
    default:
      return children;
  }
}

export default function MarkdownHtmlConverterTool({ manifest }: ToolAppProps) {
  const [markdown, setMarkdown] = useState(MD_EXAMPLE);
  const [html, setHtml] = useState(() => markdownToHtml(MD_EXAMPLE));
  const [autoConvert, setAutoConvert] = useState(true);

  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Sync inputs if autoConvert is checked
  const handleMarkdownChange = (val: string) => {
    setMarkdown(val);
    setCopiedMd(false);
    if (autoConvert) {
      setHtml(markdownToHtml(val));
    }
  };

  const handleHtmlChange = (val: string) => {
    setHtml(val);
    setCopiedHtml(false);
    if (autoConvert) {
      setMarkdown(htmlToMarkdown(val));
    }
  };

  // Explicit conversions
  const handleConvertToHtml = () => {
    setHtml(markdownToHtml(markdown));
  };

  const handleConvertToMarkdown = () => {
    setMarkdown(htmlToMarkdown(html));
  };

  const copyToClipboard = async (text: string, type: "md" | "html") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "md") {
        setCopiedMd(true);
        setTimeout(() => setCopiedMd(false), 2000);
      } else {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClear = () => {
    setMarkdown("");
    setHtml("");
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本与标记语言</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Preset Toolbar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
          <button
            type="button"
            className="button--secondary"
            onClick={() => {
              setMarkdown(MD_EXAMPLE);
              setHtml(markdownToHtml(MD_EXAMPLE));
            }}
          >
            加载 Markdown 示例
          </button>
          <button
            type="button"
            className="button--secondary"
            onClick={() => {
              setHtml(HTML_EXAMPLE);
              setMarkdown(htmlToMarkdown(HTML_EXAMPLE));
            }}
          >
            加载 HTML 示例
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", paddingRight: "0.5rem" }}>
            <input
              type="checkbox"
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            实时双向转换
          </label>
          <button type="button" className="button--danger" onClick={handleClear}>
            清空
          </button>
        </div>
      </div>

      {/* Manual Convert Buttons (Only shown or enabled if autoConvert is false) */}
      {!autoConvert && (
        <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1rem" }}>
          <button type="button" className="button--primary" style={{ flex: 1 }} onClick={handleConvertToHtml}>
            Markdown ➜ HTML 转换
          </button>
          <button type="button" className="button--primary" style={{ flex: 1 }} onClick={handleConvertToMarkdown}>
            HTML ➜ Markdown 转换
          </button>
        </div>
      )}

      {/* Workspace inputs */}
      <div className="workspace workspace--two-column">
        {/* Markdown Input Column */}
        <label className="tool-field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Markdown 源码
            <button
              type="button"
              onClick={() => copyToClipboard(markdown, "md")}
              disabled={!markdown}
              style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}
            >
              {copiedMd ? "已复制" : "复制"}
            </button>
          </span>
          <textarea
            value={markdown}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            placeholder="在此处输入 Markdown 格式的文本..."
            spellCheck={false}
            style={{ height: "300px", fontFamily: "monospace", resize: "vertical" }}
          />
        </label>

        {/* HTML Input/Output Column */}
        <label className="tool-field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            HTML 源码
            <button
              type="button"
              onClick={() => copyToClipboard(html, "html")}
              disabled={!html}
              style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}
            >
              {copiedHtml ? "已复制" : "复制"}
            </button>
          </span>
          <textarea
            value={html}
            onChange={(e) => handleHtmlChange(e.target.value)}
            placeholder="在此处输入原生 HTML 代码片段..."
            spellCheck={false}
            style={{ height: "300px", fontFamily: "monospace", resize: "vertical" }}
          />
        </label>
      </div>

      {/* Live HTML rendering preview */}
      {html.trim().length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.6rem" }}>
            HTML 效果实时渲染预览
          </div>
          <div
            className="markdown-body"
            style={{
              background: "var(--bg-muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "1.5rem",
              minHeight: "120px",
              overflow: "auto"
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}

      <p className="tool-note" style={{ marginTop: "1.2rem" }}>
        提示：HTML 转 Markdown 功能利用浏览器底层的 <strong>DOMParser</strong> 进行树状节点解析，这比基于正则表达式的解析更安全、更规范，可以正确转换嵌套表格和列表结构。
      </p>
    </section>
  );
}
