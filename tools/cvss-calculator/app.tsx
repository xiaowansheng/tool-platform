"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const metricKeys = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"] as const;

type MetricKey = (typeof metricKeys)[number];
type MetricValues = Record<MetricKey, string>;

interface MetricOption {
  value: string;
  label: string;
}

const metricLabels: Record<MetricKey, string> = {
  AV: "攻击向量",
  AC: "攻击复杂度",
  PR: "所需权限",
  UI: "用户交互",
  S: "影响范围",
  C: "机密性影响",
  I: "完整性影响",
  A: "可用性影响"
};

const metricOptions: Record<MetricKey, MetricOption[]> = {
  AV: [
    { value: "N", label: "网络" },
    { value: "A", label: "相邻网络" },
    { value: "L", label: "本地" },
    { value: "P", label: "物理" }
  ],
  AC: [
    { value: "L", label: "低" },
    { value: "H", label: "高" }
  ],
  PR: [
    { value: "N", label: "无" },
    { value: "L", label: "低" },
    { value: "H", label: "高" }
  ],
  UI: [
    { value: "N", label: "无需" },
    { value: "R", label: "需要" }
  ],
  S: [
    { value: "U", label: "不变" },
    { value: "C", label: "改变" }
  ],
  C: [
    { value: "H", label: "高" },
    { value: "L", label: "低" },
    { value: "N", label: "无" }
  ],
  I: [
    { value: "H", label: "高" },
    { value: "L", label: "低" },
    { value: "N", label: "无" }
  ],
  A: [
    { value: "H", label: "高" },
    { value: "L", label: "低" },
    { value: "N", label: "无" }
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
  if (score === 0) return "无";
  if (score < 4) return "低危";
  if (score < 7) return "中危";
  if (score < 9) return "高危";
  return "严重";
}

export default function CvssCalculatorTool({ manifest }: ToolAppProps) {
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
          <p className="eyebrow">漏洞评分</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>基础分</h3>
          <p>{result.score.toFixed(1)}</p>
        </article>
        <article className="detail-card">
          <h3>严重级别</h3>
          <p>{severity}</p>
        </article>
        <article className="detail-card">
          <h3>影响分</h3>
          <p>{Math.max(result.impact, 0).toFixed(2)}</p>
        </article>
        <article className="detail-card">
          <h3>可利用性</h3>
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
          {copied ? "已复制 Vector" : "复制 Vector"}
        </button>
        <button type="button" onClick={() => { setMetrics(initialMetrics); setCopied(false); }}>
          重置默认高危示例
        </button>
      </div>

      <label className="tool-field">
        <span>CVSS Vector</span>
        <textarea value={vector} readOnly spellCheck={false} />
      </label>
      <p className="tool-note">当前按 CVSS v3.1 基础分 计算，适合漏洞初筛、报告记录和复核 Vector 是否一致。</p>
    </section>
  );
}
