"use client";

import React, { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleMarkdown = `# Markdown 预览器 📝

这是一个高保真的 Markdown 编辑与实时预览工具。支持常见 Markdown 语法，完全在本地安全运行。

## 功能特性
1. **实时预览**：左侧编辑，右侧同步渲染。
2. **纯真渲染**：支持以下常用排版：
   - 标题级数 (\`#\` 到 \`######\`)
   - 加粗 (\`**粗体**\`)、斜体 (\`*斜体*\`)、删除线 (\`~~删除线~~\`)
   - 块级引用 (\`>\` 引用文本)
   - 行内代码 \`const text = "hello"\`
   - 多行代码块 (支持语法高亮风格显示)
   - 无序列表 (\`-\` 或 \`*\`) 与有序列表 (\`1.\`)
   - 水平分割线 (\`---\`)
   - 超链接 [GitHub](https://github.com) 与图片
   - 表格支持

> 这是一个引言块 (Blockquote)。在这里写下名言、备注或者警告信息。

### 代码展示
\`\`\`typescript
function greet(name: string): string {
  console.log("Hello, " + name);
  return \`欢迎使用 \${name}!\`;
}
\`\`\`

### 表格演示

| 工具名称 | 功能分类 | 运行环境 |
| :--- | :--- | :--- |
| Markdown 预览器 | 文本工具 | 浏览器本地 |
| 占位文本生成器 | 文本工具 | 浏览器本地 |
| PDF 元数据工具 | 文件工具 | 浏览器本地 |

---
你可以在左侧修改此文本，右侧会即时同步更新！
`;

export default function MarkdownPreviewTool({ manifest }: ToolAppProps) {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [activeTab, setActiveTab] = useState<"split" | "edit" | "preview">("split");

  // Inline element parser mapping text to React elements
  const renderInline = (text: string): React.ReactNode[] => {
    let tokens: { type: string; content: string; extra?: string }[] = [{ type: "text", content: text }];

    const applyRegex = (
      regex: RegExp,
      type: string,
      mapFn: (match: string[]) => { content: string; extra?: string }
    ) => {
      const nextTokens: typeof tokens = [];
      for (const token of tokens) {
        if (token.type !== "text") {
          nextTokens.push(token);
          continue;
        }

        let lastIndex = 0;
        let match: RegExpExecArray | null;
        // reset regex lastIndex
        regex.lastIndex = 0;

        while ((match = regex.exec(token.content)) !== null) {
          const before = token.content.substring(lastIndex, match.index);
          if (before) {
            nextTokens.push({ type: "text", content: before });
          }

          const parsed = mapFn(match);
          nextTokens.push({ type, content: parsed.content, extra: parsed.extra });
          lastIndex = regex.lastIndex;
        }

        const after = token.content.substring(lastIndex);
        if (after) {
          nextTokens.push({ type: "text", content: after });
        }
      }
      tokens = nextTokens;
    };

    // Images: ![alt](url)
    applyRegex(/!\[([^\]]*)\]\(([^)]+)\)/g, "image", (m) => ({ content: m[1], extra: m[2] }));
    // Links: [text](url)
    applyRegex(/\[([^\]]+)\]\(([^)]+)\)/g, "link", (m) => ({ content: m[1], extra: m[2] }));
    // Bold: **text** or __text__
    applyRegex(/\*\*([^*]+)\*\*/g, "bold", (m) => ({ content: m[1] }));
    applyRegex(/__([^_]+)__/g, "bold", (m) => ({ content: m[1] }));
    // Italic: *text* or _text_
    applyRegex(/\*([^*]+)\*/g, "italic", (m) => ({ content: m[1] }));
    applyRegex(/_([^_]+)_/g, "italic", (m) => ({ content: m[1] }));
    // Strikethrough: ~~text~~
    applyRegex(/~~([^~]+)~~/g, "strike", (m) => ({ content: m[1] }));
    // Inline code: `code`
    applyRegex(/`([^`]+)`/g, "code", (m) => ({ content: m[1] }));

    return tokens.map((token, i) => {
      switch (token.type) {
        case "bold":
          return <strong key={i}>{token.content}</strong>;
        case "italic":
          return <em key={i}>{token.content}</em>;
        case "strike":
          return <del key={i}>{token.content}</del>;
        case "code":
          return <code key={i} style={{ backgroundColor: "rgba(0,0,0,0.06)", padding: "2px 4px", borderRadius: "4px", fontSize: "0.9em", fontFamily: "monospace" }}>{token.content}</code>;
        case "link":
          return (
            <a key={i} href={token.extra} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>
              {token.content}
            </a>
          );
        case "image":
          return <img key={i} src={token.extra} alt={token.content} style={{ maxWidth: "100%", height: "auto" }} />;
        default:
          return <span key={i}>{token.content}</span>;
      }
    });
  };

  // Block elements parser
  const renderBlocks = useMemo(() => {
    const lines = markdown.split("\n");
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Empty line
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Horizontal Rule
      if (/^(?:-{3,}|\*{3,}|\_{3,})$/.test(line.trim())) {
        blocks.push(<hr key={`hr-${i}`} style={{ margin: "24px 0", border: 0, borderTop: "1px solid rgba(0,0,0,0.1)" }} />);
        i++;
        continue;
      }

      // Headers (# to ######)
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const content = renderInline(text);
        const style = { marginTop: "1.2em", marginBottom: "0.6em", fontWeight: 600 };
        switch (level) {
          case 1:
            blocks.push(<h1 key={i} style={{ ...style, fontSize: "1.8em", borderBottom: "1px solid rgba(0,0,0,0.15)", paddingBottom: "0.3em" }}>{content}</h1>);
            break;
          case 2:
            blocks.push(<h2 key={i} style={{ ...style, fontSize: "1.5em", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "0.2em" }}>{content}</h2>);
            break;
          case 3:
            blocks.push(<h3 key={i} style={{ ...style, fontSize: "1.3em" }}>{content}</h3>);
            break;
          case 4:
            blocks.push(<h4 key={i} style={{ ...style, fontSize: "1.1em" }}>{content}</h4>);
            break;
          default:
            blocks.push(<h5 key={i} style={{ ...style, fontSize: "1em" }}>{content}</h5>);
        }
        i++;
        continue;
      }

      // Code block ( ``` )
      if (line.trim().startsWith("```")) {
        const lang = line.trim().slice(3);
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push(
          <pre
            key={`code-${i}`}
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              padding: "16px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              overflowX: "auto",
              border: "1px solid rgba(0,0,0,0.06)",
              margin: "12px 0"
            }}
          >
            <code className={lang}>{codeLines.join("\n")}</code>
          </pre>
        );
        continue;
      }

      // Blockquote ( > )
      if (line.startsWith(">")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith(">")) {
          quoteLines.push(lines[i].slice(1).trim());
          i++;
        }
        blocks.push(
          <blockquote
            key={`quote-${i}`}
            style={{
              borderLeft: "4px solid #3b82f6",
              backgroundColor: "rgba(59,130,246,0.05)",
              padding: "12px 16px",
              margin: "16px 0",
              borderRadius: "0 8px 8px 0",
              fontStyle: "italic",
              opacity: 0.9
            }}
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} style={{ margin: qIdx > 0 ? "8px 0 0 0" : 0 }}>
                {renderInline(ql)}
              </p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Table block
      if (line.trim().startsWith("|")) {
        const tableRows: string[][] = [];
        let hasSeparator = false;

        while (i < lines.length && lines[i].trim().startsWith("|")) {
          const rowText = lines[i].trim();
          // Check if separator row (e.g. |---|---|)
          if (/^\|[\s\:\-\|]+$/.test(rowText)) {
            hasSeparator = true;
          } else {
            // Split cells, filtering out first and last empty cells
            const cells = rowText
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim());
            tableRows.push(cells);
          }
          i++;
        }

        if (tableRows.length > 0) {
          const headers = hasSeparator ? tableRows[0] : null;
          const bodyRows = hasSeparator ? tableRows.slice(1) : tableRows;

          blocks.push(
            <div key={`table-wrapper-${i}`} style={{ overflowX: "auto", margin: "16px 0" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid rgba(0,0,0,0.1)",
                  fontSize: "14px"
                }}
              >
                {headers && (
                  <thead>
                    <tr style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                      {headers.map((cell, cIdx) => (
                        <th
                          key={cIdx}
                          style={{
                            border: "1px solid rgba(0,0,0,0.1)",
                            padding: "8px 12px",
                            fontWeight: 600,
                            textAlign: "left"
                          }}
                        >
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            border: "1px solid rgba(0,0,0,0.1)",
                            padding: "8px 12px",
                            textAlign: "left"
                          }}
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Unordered list items ( - or * or + )
      const listMatch = line.match(/^(\s*)([\-\*\+])\s+(.*)$/);
      if (listMatch) {
        const listItems: string[] = [];
        while (i < lines.length) {
          const lm = lines[i].match(/^(\s*)([\-\*\+])\s+(.*)$/);
          if (!lm) break;
          listItems.push(lm[3]);
          i++;
        }
        blocks.push(
          <ul key={`ul-${i}`} style={{ paddingLeft: "24px", margin: "12px 0", listStyleType: "disc" }}>
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx} style={{ margin: "4px 0" }}>
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list items ( 1. )
      const oListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (oListMatch) {
        const listItems: string[] = [];
        while (i < lines.length) {
          const lm = lines[i].match(/^(\s*)(\d+)\.\s+(.*)$/);
          if (!lm) break;
          listItems.push(lm[3]);
          i++;
        }
        blocks.push(
          <ol key={`ol-${i}`} style={{ paddingLeft: "24px", margin: "12px 0", listStyleType: "decimal" }}>
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx} style={{ margin: "4px 0" }}>
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Default to Paragraph
      blocks.push(
        <p key={`p-${i}`} style={{ margin: "12px 0", lineHeight: "1.6" }}>
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return blocks;
  }, [markdown]);

  const stats = useMemo(() => {
    return {
      characters: markdown.length,
      lines: markdown.split("\n").length,
      words: markdown.split(/\s+/).filter(Boolean).length
    };
  }, [markdown]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={activeTab === "split" ? "button--primary" : ""}
            onClick={() => setActiveTab("split")}
            style={{ padding: "6px 12px", minWidth: 80 }}
          >
            分栏预览
          </button>
          <button
            type="button"
            className={activeTab === "edit" ? "button--primary" : ""}
            onClick={() => setActiveTab("edit")}
            style={{ padding: "6px 12px", minWidth: 80 }}
          >
            仅编辑器
          </button>
          <button
            type="button"
            className={activeTab === "preview" ? "button--primary" : ""}
            onClick={() => setActiveTab("preview")}
            style={{ padding: "6px 12px", minWidth: 80 }}
          >
            仅预览
          </button>
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMarkdown("")}
            style={{ padding: "6px 12px" }}
          >
            清空
          </button>
          <button
            type="button"
            onClick={() => setMarkdown(sampleMarkdown)}
            style={{ padding: "6px 12px" }}
          >
            恢复示例
          </button>
        </div>
      </div>

      <div
        className="workspace"
        style={{
          display: "grid",
          gridTemplateColumns: activeTab === "split" ? "1fr 1fr" : "1fr",
          gap: "24px",
          minHeight: "450px"
        }}
      >
        {(activeTab === "split" || activeTab === "edit") && (
          <label className="tool-field" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <span style={{ fontWeight: 600, marginBottom: "8px" }}>Markdown 编辑区</span>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="在这里输入 Markdown 文本..."
              style={{
                flex: 1,
                minHeight: "400px",
                fontFamily: "monospace",
                fontSize: "14px",
                lineHeight: "1.5",
                padding: "16px",
                resize: "vertical"
              }}
              spellCheck={false}
            />
          </label>
        )}

        {(activeTab === "split" || activeTab === "preview") && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <span style={{ fontWeight: 600, marginBottom: "8px" }}>实时预览</span>
            <div
              style={{
                flex: 1,
                minHeight: "400px",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                padding: "20px 24px",
                backgroundColor: "var(--background-card, #ffffff)",
                overflowY: "auto",
                color: "var(--foreground, #333)"
              }}
              className="markdown-preview-body"
            >
              {renderBlocks}
            </div>
          </div>
        )}
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>字符数</h3>
          <p>{stats.characters} 字</p>
        </article>
        <article className="detail-card">
          <h3>词数 (英文单词数)</h3>
          <p>{stats.words} 个</p>
        </article>
        <article className="detail-card">
          <h3>总行数</h3>
          <p>{stats.lines} 行</p>
        </article>
      </div>
    </section>
  );
}
