"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

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
    "# README Quality Report",
    "",
    `Score: ${score}/100`,
    "",
    "## Passed",
    ...(passed.length > 0 ? passed.map((check) => `- ${check.label}`) : ["- None"]),
    "",
    "## Gaps",
    ...(gaps.length > 0 ? gaps.map((check) => `- ${check.label}: ${check.hint}`) : ["- No major gaps detected"]),
    "",
    "## Metrics",
    "",
    `- Words: ${metrics.words}`,
    `- Headings: ${metrics.headings}`,
    `- Code blocks: ${metrics.codeBlocks}`,
    `- Links: ${metrics.links}`,
    `- Images: ${metrics.images}`
  ].join("\n");
}

export default function ReadmeQualityCheckerTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleReadme);
  const [copied, setCopied] = useState(false);
  const analysis = analyzeReadme(input);
  const report = buildReport(input);

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">README Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-results">
        <article className="detail-card">
          <h3>Score</h3>
          <p>{analysis.score}/100</p>
        </article>
        <article className="detail-card">
          <h3>Words</h3>
          <p>{analysis.metrics.words}</p>
        </article>
        <article className="detail-card">
          <h3>Gaps</h3>
          <p>{analysis.checks.filter((check) => !check.passed).length}</p>
        </article>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyReport()}>{copied ? "已复制" : "复制质量报告"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>README.md</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Report</span>
          <textarea value={report} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>Check</span>
          <span>Status</span>
        </div>
        {analysis.checks.map((check) => (
          <div className="tool-table__row" key={check.label}>
            <span>{check.label}</span>
            <span>{check.passed ? "通过" : check.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
