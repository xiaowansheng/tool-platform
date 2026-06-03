"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type PiiSeverity = "low" | "medium" | "high";

interface Detector {
  type: string;
  severity: PiiSeverity;
  regex: RegExp;
  validate?: (value: string) => boolean;
}

interface PiiFinding {
  type: string;
  severity: PiiSeverity;
  value: string;
  start: number;
  end: number;
}

const severityLabels: Record<PiiSeverity, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const sampleText = `Contact Jane at jane@example.com or +1 (415) 555-0123.
SSN: 123-45-6789
Card: 4111 1111 1111 1111
CN ID: 110105199001011234
IP: 192.168.1.10`;

function luhnCheck(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

const detectors: Detector[] = [
  {
    type: "邮箱",
    severity: "high",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    type: "电话",
    severity: "medium",
    regex: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g
  },
  {
    type: "美国 SSN",
    severity: "high",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g
  },
  {
    type: "中国身份证",
    severity: "high",
    regex: /\b\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g
  },
  {
    type: "信用卡",
    severity: "high",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: luhnCheck
  },
  {
    type: "IPv4 地址",
    severity: "low",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g
  },
  {
    type: "Date of birth",
    severity: "medium",
    regex: /\b(?:DOB|birth(?:day|date)?)[:\s-]*(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b/gi
  },
  {
    type: "Street address",
    severity: "medium",
    regex: /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi
  },
  {
    type: "AWS 访问密钥",
    severity: "high",
    regex: /AKIA[0-9A-Z]{16}/g
  },
  {
    type: "GitHub Token",
    severity: "high",
    regex: /gh[pousr]_[A-Za-z0-9_]{20,}/g
  },
  {
    type: "Slack Token",
    severity: "high",
    regex: /xox[baprs]-[A-Za-z0-9-]{20,}/g
  },
  {
    type: "私钥 (Private Key)",
    severity: "high",
    regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g
  },
  {
    type: "Env 环境变量密钥",
    severity: "medium",
    regex: /\b[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY)[A-Z0-9_]*\s*=\s*["']?[^"'\s]{8,}/g
  },
  {
    type: "高熵通用字符串 (高熵数据)",
    severity: "low",
    regex: /\b[A-Za-z0-9+/=_-]{32,}\b/g
  }
];

function detectPii(input: string) {
  const findings: PiiFinding[] = [];

  for (const detector of detectors) {
    const regex = new RegExp(detector.regex);

    for (const match of input.matchAll(regex)) {
      const value = match[0];
      const start = match.index ?? 0;

      if (detector.validate && !detector.validate(value)) continue;

      findings.push({
        type: detector.type,
        severity: detector.severity,
        value,
        start,
        end: start + value.length
      });
    }
  }

  return findings.sort((left, right) => left.start - right.start || right.end - left.end);
}

function maskValue(value: string, type: string, partial: boolean) {
  if (!partial || value.length <= 6) return `[${type}]`;
  return `${value.slice(0, 2)}${"*".repeat(Math.max(3, value.length - 4))}${value.slice(-2)}`;
}

function redact(input: string, findings: PiiFinding[], partial: boolean) {
  return findings
    .slice()
    .sort((left, right) => right.start - left.start)
    .reduce((current, finding) => {
      return current.slice(0, finding.start) + maskValue(finding.value, finding.type, partial) + current.slice(finding.end);
    }, input);
}

export default function PiiDetectorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleText);
  const [minimumSeverity, setMinimumSeverity] = useState<PiiSeverity>("low");
  const [partialMask, setPartialMask] = useState(false);
  const severityOrder: Record<PiiSeverity, number> = { low: 1, medium: 2, high: 3 };
  const findings = useMemo(() => detectPii(input), [input]);
  const visibleFindings = findings.filter((finding) => severityOrder[finding.severity] >= severityOrder[minimumSeverity]);
  const redacted = useMemo(() => redact(input, visibleFindings, partialMask), [input, partialMask, visibleFindings]);
  const counts = findings.reduce(
    (summary, finding) => ({
      high: summary.high + (finding.severity === "high" ? 1 : 0),
      medium: summary.medium + (finding.severity === "medium" ? 1 : 0),
      low: summary.low + (finding.severity === "low" ? 1 : 0)
    }),
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">隐私扫描</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>最低严重级别</span>
          <select value={minimumSeverity} onChange={(event) => setMinimumSeverity(event.target.value as PiiSeverity)}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={partialMask} onChange={(event) => setPartialMask(event.target.checked)} />
          <span>部分脱敏</span>
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>脱敏输出</span>
          <textarea value={redacted} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>高风险</h3>
          <p>{counts.high}</p>
        </article>
        <article className="detail-card">
          <h3>中风险</h3>
          <p>{counts.medium}</p>
        </article>
        <article className="detail-card">
          <h3>低风险</h3>
          <p>{counts.low}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>发现项</span>
          <span>值</span>
        </div>
        {visibleFindings.map((finding) => (
          <div key={`${finding.type}-${finding.start}-${finding.value}`} className="tool-table__row">
            <span>{finding.type} / {severityLabels[finding.severity]}</span>
            <span className="mono-output">{maskValue(finding.value, finding.type, true)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
