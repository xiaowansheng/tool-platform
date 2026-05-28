"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const metricKeys = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"] as const;

type MetricKey = typeof metricKeys[number];
type MetricValues = Record<MetricKey, string>;

interface MetricOption {
  value: string;
  label: string;
}

const metricLabels: Record<MetricKey, string> = {
  AV: "Attack Vector",
  AC: "Attack Complexity",
  PR: "Privileges Required",
  UI: "User Interaction",
  S: "Scope",
  C: "Confidentiality",
  I: "Integrity",
  A: "Availability"
};

const metricOptions: Record<MetricKey, MetricOption[]> = {
  AV: [
    { value: "N", label: "Network" },
    { value: "A", label: "Adjacent" },
    { value: "L", label: "Local" },
    { value: "P", label: "Physical" }
  ],
  AC: [
    { value: "L", label: "Low" },
    { value: "H", label: "High" }
  ],
  PR: [
    { value: "N", label: "None" },
    { value: "L", label: "Low" },
    { value: "H", label: "High" }
  ],
  UI: [
    { value: "N", label: "None" },
    { value: "R", label: "Required" }
  ],
  S: [
    { value: "U", label: "Unchanged" },
    { value: "C", label: "Changed" }
  ],
  C: [
    { value: "H", label: "High" },
    { value: "L", label: "Low" },
    { value: "N", label: "None" }
  ],
  I: [
    { value: "H", label: "High" },
    { value: "L", label: "Low" },
    { value: "N", label: "None" }
  ],
  A: [
    { value: "H", label: "High" },
    { value: "L", label: "Low" },
    { value: "N", label: "None" }
  ]
};

const baseWeights = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 }
};

const initialMetrics: MetricValues = {
  AV: "N",
  AC: "L",
  PR: "N",
  UI: "N",
  S: "U",
  C: "H",
  I: "H",
  A: "H"
};

function roundUp(value: number) {
  return Math.ceil((value - Number.EPSILON) * 10) / 10;
}

function privilegeWeight(scope: string, privilege: string) {
  if (privilege === "N") return 0.85;
  if (privilege === "L") return scope === "C" ? 0.68 : 0.62;
  return scope === "C" ? 0.5 : 0.27;
}

function calculateCvss(metrics: MetricValues) {
  const impactBase = 1
    - (1 - baseWeights.CIA[metrics.C as keyof typeof baseWeights.CIA])
    * (1 - baseWeights.CIA[metrics.I as keyof typeof baseWeights.CIA])
    * (1 - baseWeights.CIA[metrics.A as keyof typeof baseWeights.CIA]);
  const impact = metrics.S === "U"
    ? 6.42 * impactBase
    : 7.52 * (impactBase - 0.029) - 3.25 * ((impactBase - 0.02) ** 15);
  const exploitability = 8.22
    * baseWeights.AV[metrics.AV as keyof typeof baseWeights.AV]
    * baseWeights.AC[metrics.AC as keyof typeof baseWeights.AC]
    * privilegeWeight(metrics.S, metrics.PR)
    * baseWeights.UI[metrics.UI as keyof typeof baseWeights.UI];
  const score = impact <= 0
    ? 0
    : metrics.S === "U"
      ? roundUp(Math.min(impact + exploitability, 10))
      : roundUp(Math.min(1.08 * (impact + exploitability), 10));

  return {
    impactBase,
    impact,
    exploitability,
    score
  };
}

function severityFor(score: number) {
  if (score === 0) return "None";
  if (score < 4) return "Low";
  if (score < 7) return "Medium";
  if (score < 9) return "High";
  return "Critical";
}

export default function CvssCalculatorTool({ manifest }: ToolClientProps) {
  const [metrics, setMetrics] = useState<MetricValues>(initialMetrics);
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => calculateCvss(metrics), [metrics]);
  const vector = `CVSS:3.1/${metricKeys.map((key) => `${key}:${metrics[key]}`).join("/")}`;
  const severity = severityFor(result.score);

  function updateMetric(key: MetricKey, value: string) {
    setCopied(false);
    setMetrics((current) => ({ ...current, [key]: value }));
  }

  async function copyVector() {
    await navigator.clipboard.writeText(vector);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Vulnerability Scoring</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Base Score</h3>
          <p>{result.score.toFixed(1)}</p>
        </article>
        <article className="detail-card">
          <h3>Severity</h3>
          <p>{severity}</p>
        </article>
        <article className="detail-card">
          <h3>Impact</h3>
          <p>{Math.max(result.impact, 0).toFixed(2)}</p>
        </article>
        <article className="detail-card">
          <h3>Exploitability</h3>
          <p>{result.exploitability.toFixed(2)}</p>
        </article>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        {metricKeys.map((key) => (
          <label key={key} className="tool-field tool-field--compact">
            <span>{metricLabels[key]}</span>
            <select value={metrics[key]} onChange={(event) => updateMetric(key, event.target.value)}>
              {metricOptions[key].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({key}:{option.value})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyVector()}>
          {copied ? "已复制" : "复制 Vector"}
        </button>
        <button type="button" onClick={() => setMetrics(initialMetrics)}>
          重置
        </button>
      </div>

      <label className="tool-field">
        <span>CVSS Vector</span>
        <textarea value={vector} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
