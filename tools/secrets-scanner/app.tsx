"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Finding {
  rule: string;
  severity: "high" | "medium" | "low";
  match: string;
  line: number;
}

const rules: Array<{ name: string; severity: Finding["severity"]; pattern: RegExp }> = [
  { name: "AWS Access Key", severity: "high", pattern: /AKIA[0-9A-Z]{16}/g },
  { name: "GitHub Token", severity: "high", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { name: "Slack Token", severity: "high", pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/g },
  { name: "Private Key", severity: "high", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Env Secret", severity: "medium", pattern: /\b[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY)[A-Z0-9_]*\s*=\s*["']?[^"'\s]{8,}/g },
  { name: "Generic High Entropy", severity: "low", pattern: /\b[A-Za-z0-9+/=_-]{32,}\b/g }
];

const severityLabels: Record<Finding["severity"], string> = {
  high: "高",
  medium: "中",
  low: "低"
};

function scan(input: string): Finding[] {
  const findings: Finding[] = [];
  const lines = input.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const rule of rules) {
      for (const match of line.matchAll(rule.pattern)) {
        findings.push({
          rule: rule.name,
          severity: rule.severity,
          match: match[0].slice(0, 120),
          line: index + 1
        });
      }
    }
  });

  return findings;
}

export default function SecretsScannerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("API_TOKEN=replace-me\nNEXT_PUBLIC_API_URL=https://example.com\n# paste env or repo snippets here");
  const findings = scan(input);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">密钥扫描</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>文本 / env / 仓库片段</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card"><h3>发现项</h3><p>{findings.length}</p></article>
        <article className="detail-card"><h3>高风险</h3><p>{findings.filter((item) => item.severity === "high").length}</p></article>
        <article className="detail-card"><h3>中风险</h3><p>{findings.filter((item) => item.severity === "medium").length}</p></article>
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head"><span>发现项</span><span>位置 / 匹配内容</span></div>
        {findings.length > 0 ? findings.map((finding, index) => (
          <div key={`${finding.rule}-${index}`} className="tool-table__row">
            <span>{severityLabels[finding.severity]} · {finding.rule}</span>
            <span>第 {finding.line} 行：{finding.match}</span>
          </div>
        )) : <div className="tool-table__row"><span>通过</span><span>未发现明显密钥模式。</span></div>}
      </div>
      <p className="tool-note">扫描只在浏览器本地执行；规则偏保守，低风险高熵结果需要人工确认。</p>
    </section>
  );
}
