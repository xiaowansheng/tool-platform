"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// --- Quality Checker Definitions ---
interface ReadmeCheck {
  label: string;
  weight: number;
  passed: boolean;
  hint: string;
}

const sampleReadme = `# Tool Platform

[![build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/example/tool-platform/actions)

Browser-first developer tools with a plugin-style registry.

## Installation

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Usage

Open a tool page, paste input, and copy the generated output.

## License

MIT`;

const badgeColors = ["brightgreen", "green", "yellowgreen", "yellow", "orange", "red", "blue", "lightgrey", "success", "important", "informational"];
const badgeStyles = ["flat", "flat-square", "plastic", "for-the-badge", "social"];

function encodeBadgeSegment(value: string) {
  return encodeURIComponent(value.trim().replace(/-/g, "--").replace(/_/g, "__") || "badge");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildBadgeUrl(label: string, message: string, color: string, style: string, logo: string) {
  const normalizedColor = color.trim().replace(/^#/, "") || "blue";
  const params = new URLSearchParams();

  if (style) {
    params.set("style", style);
  }

  if (logo.trim()) {
    params.set("logo", logo.trim());
  }

  const query = params.toString();
  return `https://img.shields.io/badge/${encodeBadgeSegment(label)}-${encodeBadgeSegment(message)}-${encodeURIComponent(normalizedColor)}${query ? `?${query}` : ""}`;
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function analyzeReadme(readme: string) {
  const checks: ReadmeCheck[] = [
    { label: "一级标题", weight: 10, passed: /^#\s+.+/m.test(readme), hint: "添加项目名称作为 H1。" },
    { label: "项目摘要", weight: 10, passed: wordCount(readme.replace(/^#.+$/m, "")) >= 25, hint: "在标题下补充一段说明项目解决什么问题。" },
    { label: "Badge 状态区", weight: 8, passed: /!\[[^\]]*]\(https?:\/\/img\.shields\.io/i.test(readme), hint: "补充 build、license、version 等状态 Badge。" },
    { label: "安装说明", weight: 12, passed: /##\s+(installation|install|getting started|quick start|安装|快速开始)/i.test(readme), hint: "提供安装或快速开始章节。" },
    { label: "使用说明", weight: 12, passed: /##\s+(usage|examples?|quick start|使用|示例)/i.test(readme), hint: "提供最小可运行示例或常用命令。" },
    { label: "代码示例", weight: 8, passed: /```/.test(readme), hint: "加入 shell、API 或配置代码块。" },
    { label: "配置说明", weight: 8, passed: /(configuration|config|environment|\.env|配置|环境变量)/i.test(readme), hint: "列出配置项、环境变量或默认值。" },
    { label: "API / CLI 参考", weight: 8, passed: /(api reference|cli|commands?|接口|命令)/i.test(readme), hint: "说明主要 API、CLI 命令或输入输出。" },
    { label: "贡献指南", weight: 6, passed: /(contributing|development|贡献|开发)/i.test(readme), hint: "说明本地开发、测试和提交流程。" },
    { label: "许可证", weight: 8, passed: /(license|licensed under|许可证|MIT|Apache-2\.0)/i.test(readme), hint: "声明项目许可证。" },
    { label: "安全/支持", weight: 5, passed: /(security|support|contact|安全|支持)/i.test(readme), hint: "补充安全报告或支持渠道。" },
    { label: "变更记录", weight: 5, passed: /(changelog|release notes|releases|变更记录|发布说明)/i.test(readme), hint: "链接 CHANGELOG 或 Releases。" }
  ];
  const score = Math.round(checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0));
  const metrics = {
    words: wordCount(readme),
    headings: (readme.match(/^#{1,6}\s+/gm) ?? []).length,
    codeBlocks: (readme.match(/```/g) ?? []).length / 2,
    links: (readme.match(/\[[^\]]+]\([^)]+\)/g) ?? []).length,
    images: (readme.match(/!\[[^\]]*]\([^)]+\)/g) ?? []).length
  };

  return { checks, score, metrics };
}

function buildReport(readme: string) {
  const { checks, score, metrics } = analyzeReadme(readme);
  const passed = checks.filter((check) => check.passed);
  const gaps = checks.filter((check) => !check.passed);

  return [
    "# README 质量报告",
    "",
    `得分：${score}/100`,
    "",
    "## 已通过",
    ...(passed.length > 0 ? passed.map((check) => `- ${check.label}`) : ["- 无"]),
    "",
    "## 待补齐",
    ...(gaps.length > 0 ? gaps.map((check) => `- ${check.label}: ${check.hint}`) : ["- 未发现明显缺口"]),
    "",
    "## 指标",
    "",
    `- 字数： ${metrics.words}`,
    `- 标题数： ${metrics.headings}`,
    `- 代码块： ${metrics.codeBlocks}`,
    `- 链接： ${metrics.links}`,
    `- 图片： ${metrics.images}`
  ].join("\n");
}

export default function ReadmeQualityCheckerTool({ manifest }: ToolAppProps) {
  const [activeTab, setActiveTab] = useState<"checker" | "badge">("checker");

  // --- Quality Checker States ---
  const [checkerInput, setCheckerInput] = useState(sampleReadme);
  const [checkerCopied, setCheckerCopied] = useState(false);

  const analysis = analyzeReadme(checkerInput);
  const report = buildReport(checkerInput);

  const handleCopyReport = async () => {
    await navigator.clipboard.writeText(report);
    setCheckerCopied(true);
    setTimeout(() => setCheckerCopied(false), 2000);
  };

  // --- Badge Generator States ---
  const [badgeLabel, setBadgeLabel] = useState("build");
  const [badgeMessage, setBadgeMessage] = useState("passing");
  const [badgeColor, setBadgeColor] = useState("brightgreen");
  const [badgeStyle, setBadgeStyle] = useState("flat-square");
  const [badgeLogo, setBadgeLogo] = useState("githubactions");
  const [badgeLink, setBadgeLink] = useState("https://github.com/example/project/actions");
  const [badgeCopied, setBadgeCopied] = useState(false);

  const badgeUrl = buildBadgeUrl(badgeLabel, badgeMessage, badgeColor, badgeStyle, badgeLogo);
  const badgeMarkdown = badgeLink.trim() ? `[![${badgeLabel}](${badgeUrl})](${badgeLink.trim()})` : `![${badgeLabel}](${badgeUrl})`;
  const badgeHtml = badgeLink.trim()
    ? `<a href="${escapeHtml(badgeLink.trim())}"><img alt="${escapeHtml(badgeLabel)}" src="${escapeHtml(badgeUrl)}"></a>`
    : `<img alt="${escapeHtml(badgeLabel)}" src="${escapeHtml(badgeUrl)}">`;

  const handleCopyBadge = async () => {
    await navigator.clipboard.writeText(badgeMarkdown);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">README 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #eee", gap: "24px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("checker")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "checker" ? "bold" : "normal",
            color: activeTab === "checker" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "checker" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          📊 质量检查报告
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("badge")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "badge" ? "bold" : "normal",
            color: activeTab === "badge" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "badge" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          🛡️ Badge 状态徽章生成器
        </button>
      </div>

      {activeTab === "checker" ? (
        <>
          <div className="tool-results">
            <article className="detail-card">
              <h3>得分</h3>
              <p>{analysis.score}/100</p>
            </article>
            <article className="detail-card">
              <h3>字数</h3>
              <p>{analysis.metrics.words}</p>
            </article>
            <article className="detail-card">
              <h3>缺口</h3>
              <p>{analysis.checks.filter((check) => !check.passed).length}</p>
            </article>
          </div>
          <div className="tool-toolbar" style={{ marginTop: "16px" }}>
            <button type="button" onClick={handleCopyReport}>
              {checkerCopied ? "已复制" : "复制质量报告"}
            </button>
          </div>
          <div className="workspace workspace--two-column" style={{ marginTop: "16px" }}>
            <label className="tool-field">
              <span>README.md</span>
              <textarea value={checkerInput} onChange={(event) => setCheckerInput(event.target.value)} spellCheck={false} rows={12} />
            </label>
            <label className="tool-field">
              <span>报告报告</span>
              <textarea value={report} readOnly spellCheck={false} rows={12} />
            </label>
          </div>
          <div className="tool-table" style={{ marginTop: "16px" }}>
            <div className="tool-table__row tool-table__row--head">
              <span>检查项</span>
              <span>状态</span>
            </div>
            {analysis.checks.map((check) => (
              <div className="tool-table__row" key={check.label}>
                <span>{check.label}</span>
                <span>{check.passed ? "🟢 通过" : `🔴 ${check.hint}`}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Badge Generator View */}
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>标签</span>
              <input value={badgeLabel} onChange={(event) => setBadgeLabel(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>状态文本</span>
              <input value={badgeMessage} onChange={(event) => setBadgeMessage(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>颜色</span>
              <select value={badgeColor} onChange={(event) => setBadgeColor(event.target.value)}>
                {badgeColors.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="tool-field tool-field--compact">
              <span>样式</span>
              <select value={badgeStyle} onChange={(event) => setBadgeStyle(event.target.value)}>
                {badgeStyles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="workspace workspace--two-column" style={{ marginTop: "16px" }}>
            <div className="workspace workspace--stack" style={{ gap: "16px" }}>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>图标</span>
                <input value={badgeLogo} onChange={(event) => setBadgeLogo(event.target.value)} placeholder="simple-icons 名称" />
              </label>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>链接</span>
                <input value={badgeLink} onChange={(event) => setBadgeLink(event.target.value)} placeholder="可选跳转链接" />
              </label>
              <div className="detail-card" style={{ padding: "16px" }}>
                <h3>预览效果</h3>
                <p style={{ marginTop: "12px" }}>
                  <img src={badgeUrl} alt={`${badgeLabel} badge`} style={{ display: "inline-block" }} />
                </p>
              </div>
            </div>
            <div className="workspace workspace--stack" style={{ gap: "16px" }}>
              <button
                type="button"
                onClick={handleCopyBadge}
                style={{ padding: "8px", fontWeight: "600", color: "#fff", background: "#4f46e5", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                {badgeCopied ? "已复制" : "复制 Markdown Code"}
              </button>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>Markdown</span>
                <textarea value={badgeMarkdown} readOnly spellCheck={false} rows={4} />
              </label>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>HTML</span>
                <textarea value={badgeHtml} readOnly spellCheck={false} rows={4} />
              </label>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
