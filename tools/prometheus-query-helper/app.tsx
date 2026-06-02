"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type QueryMode = "rate" | "sum" | "avg" | "p95" | "error速率" | "cpu" | "memory";

const modes: Array<{ value: QueryMode; label: string }> = [
  { value: "rate", label: "速率" },
  { value: "sum", label: "按标签求和" },
  { value: "avg", label: "按标签平均" },
  { value: "p95", label: "直方图 P95" },
  { value: "error速率", label: "HTTP 5xx 比例" },
  { value: "cpu", label: "K8s CPU" },
  { value: "memory", label: "K8s 内存" }
];

function selector(metric: string, labels: string) {
  const cleanLabels = labels.trim();

  return cleanLabels ? `${metric}{${cleanLabels}}` : metric;
}

function withGroup(groupBy: string) {
  const cleanGroup = groupBy.split(",").map((item) => item.trim()).filter(Boolean).join(", ");

  return cleanGroup ? ` by (${cleanGroup})` : "";
}

function withLabelFilter(required: string, labels: string) {
  const cleanLabels = labels.trim();

  return cleanLabels ? `${required},${cleanLabels}` : required;
}

function buildQuery(mode: QueryMode, metric: string, window: string, labels: string, groupBy: string) {
  if (mode === "rate") return `sum${withGroup(groupBy)}(rate(${selector(metric, labels)}[${window}]))`;
  if (mode === "sum") return `sum${withGroup(groupBy)}(${selector(metric, labels)})`;
  if (mode === "avg") return `avg${withGroup(groupBy)}(${selector(metric, labels)})`;
  if (mode === "p95") {
    const bucketMetric = metric.endsWith("_bucket") ? metric : `${metric}_bucket`;
    const histogramGroup = groupBy.trim() ? `le, ${groupBy}` : "le";

    return `histogram_quantile(0.95, sum by (${histogramGroup})(rate(${selector(bucketMetric, labels)}[${window}])))`;
  }
  if (mode === "error速率") {
    const errorSelector = selector("http_requests_total", withLabelFilter('status=~"5.."', labels));
    const totalSelector = selector("http_requests_total", labels);

    return `sum(rate(${errorSelector}[${window}])) / sum(rate(${totalSelector}[${window}]))`;
  }
  if (mode === "cpu") {
    const labelSuffix = labels.trim() ? `,${labels.trim()}` : "";

    return `sum by (namespace, pod)(rate(container_cpu_usage_seconds_total{container!="",image!=""${labelSuffix}}[${window}]))`;
  }

  const labelSuffix = labels.trim() ? `,${labels.trim()}` : "";
  return `sum by (namespace, pod)(container_memory_working_set_bytes{container!="",image!=""${labelSuffix}})`;
}

function lintQuery(query: string, labels: string, groupBy: string) {
  const findings: string[] = [];

  if (/=~"\.\*"/.test(labels)) {
    findings.push("避免使用 =~\".*\" 这类高成本正则，优先使用精确标签过滤。");
  }

  if (groupBy.split(",").map((item) => item.trim()).filter(Boolean).length > 3) {
    findings.push("group by 标签过多可能放大时间序列基数。");
  }

  if (/rate\([^\[]+\[[0-9]+s\]\)/.test(query)) {
    findings.push("rate 窗口过短会让结果抖动，生产图表通常从 2m 或 5m 起步。");
  }

  if (!/\{.+\}/.test(query) && !/^sum|^avg/.test(query)) {
    findings.push("裸 metric 查询可能扫描过多序列，建议加入 job、namespace 或 service 标签。");
  }

  return findings;
}

function alertRule(query: string) {
  return `groups:
  - name: generated.rules
    rules:
      - alert: GeneratedPrometheusAlert
        expr: ${query}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 生成的告警表达式`;
}

export default function PrometheusQueryHelperTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<QueryMode>("rate");
  const [metric, setMetric] = useState("http_requests_total");
  const [window, setWindow] = useState("5m");
  const [labels, setLabels] = useState('job="api"');
  const [groupBy, setGroupBy] = useState("service");
  const query = useMemo(() => buildQuery(mode, metric, window, labels, groupBy), [mode, metric, window, labels, groupBy]);
  const findings = lintQuery(query, labels, groupBy);

  async function copyQuery() {
    await navigator.clipboard.writeText(query);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">可观测性工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>场景</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as QueryMode)}>
            {modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>指标</span>
          <input value={metric} onChange={(event) => setMetric(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>窗口</span>
          <input value={window} onChange={(event) => setWindow(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>分组标签</span>
          <input value={groupBy} onChange={(event) => setGroupBy(event.target.value)} />
        </label>
      </div>
      <label className="tool-field">
        <span>标签过滤</span>
        <input value={labels} onChange={(event) => setLabels(event.target.value)} placeholder={'job="api",namespace="prod"'} />
      </label>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyQuery()}>复制 PromQL</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>PromQL</span>
          <textarea value={query} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>告警规则</span>
          <textarea value={alertRule(query)} readOnly spellCheck={false} />
        </label>
      </div>
      {findings.length > 0 ? (
        <article className="detail-card">
          <h3>查询提示</h3>
          <ul className="compact-list">
            {findings.map((finding) => <li key={finding}>{finding}</li>)}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
