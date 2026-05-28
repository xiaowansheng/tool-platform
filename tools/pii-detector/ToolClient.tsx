"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

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
    type: "Email",
    severity: "high",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    type: "Phone",
    severity: "medium",
    regex: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g
  },
  {
    type: "US SSN",
    severity: "high",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g
  },
  {
    type: "China ID",
    severity: "high",
    regex: /\b\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g
  },
  {
    type: "Credit card",
    severity: "high",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: luhnCheck
  },
  {
    type: "IPv4 address",
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

export default function PiiDetectorTool({ manifest }: ToolClientProps) {
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
          <p className="eyebrow">Privacy Scanner</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Minimum severity</span>
          <select value={minimumSeverity} onChange={(event) => setMinimumSeverity(event.target.value as PiiSeverity)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={partialMask} onChange={(event) => setPartialMask(event.target.checked)} />
          <span>Partial mask</span>
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Input</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Redacted output</span>
          <textarea value={redacted} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>High</h3>
          <p>{counts.high}</p>
        </article>
        <article className="detail-card">
          <h3>Medium</h3>
          <p>{counts.medium}</p>
        </article>
        <article className="detail-card">
          <h3>Low</h3>
          <p>{counts.low}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>Finding</span>
          <span>Value</span>
        </div>
        {visibleFindings.map((finding) => (
          <div key={`${finding.type}-${finding.start}-${finding.value}`} className="tool-table__row">
            <span>{finding.type} / {finding.severity}</span>
            <span className="mono-output">{maskValue(finding.value, finding.type, true)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
