"use client";

import { useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface RegexMatch {
  value: string;
  index: number;
  groups: string[];
}

function uniqueFlags(flags: string) {
  return Array.from(new Set(flags.split("")).values()).join("");
}

const COMMON_PRESETS = [
  {
    name: "手机号",
    pattern: "1[3-9]\\d{9}",
    flags: "g",
    content: "联系电话有：13812345678、15987654321，但12345678901不是有效手机号。"
  },
  {
    name: "电子邮箱",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    flags: "g",
    content: "我的邮箱是 example.user_123@domain.com，如果有问题，可以抄送给 admin@test.org 咨询。"
  },
  {
    name: "网址 URL",
    pattern: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    flags: "gi",
    content: "你可以访问我们的官网 https://www.google.com 或开发文档 http://localhost:3000/docs 获取帮助。"
  },
  {
    name: "IPv4 地址",
    pattern: "(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",
    flags: "g",
    content: "局域网网关为 192.168.1.1，本机的局域网 IP 是 192.168.1.104，公网DNS为 8.8.8.8。"
  },
  {
    name: "中国身份证号",
    pattern: "[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]",
    flags: "g",
    content: "张三的身份证号是：11010119900307235X。李四的身份证号是：440106198510204812。"
  },
  {
    name: "日期 (YYYY-MM-DD)",
    pattern: "\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])",
    flags: "g",
    content: "今天是 2026-06-03。明天是 2026-06-04。项目的截止日期是 2026-12-31。"
  },
  {
    name: "中文字符",
    pattern: "[\\u4e00-\\u9fa5]+",
    flags: "g",
    content: "Hello 世界！This is a 调试中文字符的 Regex 演示。"
  }
];

export default function RegexTesterTool({ manifest }: ToolAppProps) {
  const [pattern, setPattern] = useState("\\btool\\b");
  const [flags, setFlags] = useState("gi");
  const [content, setContent] = useState("Tool Platform lets tool builders ship simple tools first.");
  const [replacement, setReplacement] = useState("[$&]");
  const [replacedContent, setReplacedContent] = useState("");

  let error = "";
  let matches: RegexMatch[] = [];

  try {
    const normalizedFlags = uniqueFlags(flags.includes("g") ? flags : flags + "g");
    const expression = new RegExp(pattern, normalizedFlags);
    matches = Array.from(content.matchAll(expression)).slice(0, 200).map((match) => ({
      value: match[0],
      index: match.index ?? 0,
      groups: match.slice(1)
    }));
  } catch (regexError) {
    error = regexError instanceof Error ? regexError.message : "表达式无效";
  }

  // Update replacement output
  useEffect(() => {
    if (error || !pattern) {
      setReplacedContent("");
      return;
    }
    try {
      const normalizedFlags = uniqueFlags(flags.includes("g") ? flags : flags + "g");
      const expression = new RegExp(pattern, normalizedFlags);
      setReplacedContent(content.replace(expression, replacement));
    } catch (err) {
      setReplacedContent(err instanceof Error ? err.message : "替换出错");
    }
  }, [pattern, flags, content, replacement, error]);

  // Load a preset
  function loadPreset(preset: typeof COMMON_PRESETS[0]) {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setContent(preset.content);
  }

  // Generate highlighted preview element
  function renderHighlightedContent() {
    if (matches.length === 0 || error || !pattern) return content;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort matches to process sequentially
    const sortedMatches = [...matches].sort((a, b) => a.index - b.index);

    sortedMatches.forEach((match, i) => {
      // Add preceding plain text
      if (match.index > lastIndex) {
        elements.push(content.slice(lastIndex, match.index));
      }
      // Add highlighted match span
      elements.push(
        <mark key={i} className="regex-highlight">
          {match.value}
        </mark>
      );
      lastIndex = match.index + match.value.length;
    });

    // Add trailing text
    if (lastIndex < content.length) {
      elements.push(content.slice(lastIndex));
    }

    return elements;
  }

  return (
    <section className="tool-panel">
      <style>{`
        .regex-highlight {
          background-color: rgba(245, 158, 11, 0.35);
          color: inherit;
          border-bottom: 2px solid #f59e0b;
          border-radius: 2px;
          padding: 1px 0;
        }
        .highlight-area {
          min-height: 120px;
          max-height: 240px;
          overflow-y: auto;
          border-radius: 8px;
          padding: 12px;
          font-family: var(--font-mono, monospace);
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-all;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        [data-theme="light"] .highlight-area {
          background: rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .pattern-preset-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .preset-btn {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        [data-theme="light"] .preset-btn {
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.02);
          color: #475569;
        }
        .preset-btn:hover {
          background: var(--brand-primary, #6366f1);
          color: #ffffff;
          border-color: var(--brand-primary, #6366f1);
        }
      `}</style>

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">匹配调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--stack">
        {/* 常用模板 */}
        <div>
          <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 600 }}>常用正则模板</span>
          <div className="pattern-preset-list">
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="preset-btn"
                onClick={() => loadPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* 工具栏输入项 */}
        <div className="tool-toolbar tool-toolbar--grid">
          <label className="tool-field tool-field--compact">
            <span>正则表达式模式</span>
            <input value={pattern} onChange={(event) => setPattern(event.target.value)} spellCheck={false} placeholder="\\bword\\b" />
          </label>
          <label className="tool-field tool-field--compact">
            <span>匹配标志 (Flags)</span>
            <input value={flags} onChange={(event) => setFlags(event.target.value)} spellCheck={false} placeholder="gi" />
          </label>
        </div>

        {/* 主工作空间 */}
        <div className="workspace workspace--two-column" style={{ padding: 0 }}>
          {/* 左侧：输入与高亮 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <label className="tool-field">
              <span>测试文本</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                spellCheck={false}
                style={{ minHeight: "120px" }}
              />
            </label>
            <div>
              <span style={{ display: "block", fontSize: "14px", color: "var(--text-muted)", marginBottom: "6px" }}>匹配高亮预览</span>
              <div className="highlight-area">{renderHighlightedContent()}</div>
            </div>
          </div>

          {/* 右侧：替换与匹配明细 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="tool-field">
                <span>正则替换模式 (支持 $1, $2, $& 等)</span>
                <input
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                  spellCheck={false}
                  placeholder="匹配项替换内容"
                />
              </label>
              <label className="tool-field">
                <span>替换结果</span>
                <textarea
                  value={replacedContent}
                  readOnly
                  spellCheck={false}
                  style={{ minHeight: "120px", background: "rgba(255, 255, 255, 0.01)", cursor: "default" }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 统计指标卡 */}
        <div className="detail-grid">
          <article className="detail-card">
            <h3>匹配总数</h3>
            <p>{matches.length}</p>
          </article>
          <article className="detail-card">
            <h3>文本总字符数</h3>
            <p>{content.length}</p>
          </article>
          <article className="detail-card">
            <h3>正则表达式状态</h3>
            <p style={{ color: error ? "#ef4444" : "#10b981", fontWeight: "bold" }}>{error ? "语法错误" : "正常可用"}</p>
          </article>
        </div>

        {/* 匹配详情列表 */}
        <div className="tool-table regex-match-table">
          <div className="tool-table__row tool-table__row--head regex-match-table__row">
            <span>序号</span>
            <span>起始索引</span>
            <span>匹配内容 & 捕获组</span>
          </div>
          {matches.length > 0 ? matches.map((match, index) => (
            <div key={index + "-" + match.index + "-" + match.value} className="tool-table__row regex-match-table__row">
              <span>{index + 1}</span>
              <span>{match.index}</span>
              <span className="mono-output" style={{ wordBreak: "break-all" }}>
                <span style={{ color: "#f59e0b", fontWeight: "bold" }}>{match.value}</span>
                {match.groups.length > 0 ? (
                  <span style={{ opacity: 0.6, fontSize: "12px", marginLeft: "10px" }}>
                    捕获组: [{match.groups.map(g => g === undefined ? "undefined" : `"${g}"`).join(", ")}]
                  </span>
                ) : null}
              </span>
            </div>
          )) : (
            <div className="tool-table__row regex-match-table__row">
              <span>-</span>
              <span>-</span>
              <span>{error ? "表达式存在语法错误，需要修正" : "没有匹配结果"}</span>
            </div>
          )}
        </div>
        {error ? <p className="tool-error">{error}</p> : null}
      </div>
    </section>
  );
}
