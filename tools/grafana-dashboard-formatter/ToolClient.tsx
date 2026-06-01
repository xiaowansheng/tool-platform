"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type OutputMode = "pretty" | "compact" | "inventory";

interface GrafanaPanel {
  id?: number;
  title?: string;
  type?: string;
  datasource?: unknown;
  targets?: Array<{ expr?: string; query?: string; refId?: string }>;
  panels?: GrafanaPanel[];
}

interface GrafanaDashboard {
  uid?: string;
  title?: string;
  schemaVersion?: number;
  tags?: string[];
  panels?: GrafanaPanel[];
}

const sampleDashboard = JSON.stringify({
  uid: "api-overview",
  title: "API 概览",
  schemaVersion: 39,
  tags: ["api", "sre"],
  panels: [
    {
      id: 1,
      title: "请求速率",
      type: "timeseries",
      datasource: { type: "prometheus", uid: "prometheus" },
      targets: [{ refId: "A", expr: "sum(rate(http_requests_total[5m]))" }]
    },
    {
      id: 2,
      title: "P95 延迟",
      type: "timeseries",
      datasource: { type: "prometheus", uid: "prometheus" },
      targets: [{ refId: "A", expr: "histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m])))" }]
    }
  ]
}, null, 2);

function parseDashboard(source: string) {
  return JSON.parse(source) as GrafanaDashboard;
}

function flattenPanels(panels: GrafanaPanel[] = []): GrafanaPanel[] {
  return panels.flatMap((panel) => [panel, ...flattenPanels(panel.panels ?? [])]);
}

function validateDashboard(dashboard: GrafanaDashboard) {
  const findings: string[] = [];
  const panels = flattenPanels(dashboard.panels);
  const ids = new Set<number>();
  const duplicates = new Set<number>();

  if (!dashboard.title) findings.push("Dashboard 缺少 title。");
  if (!dashboard.uid) findings.push("Dashboard 缺少 uid，导入不同环境时不易稳定引用。");
  if (!dashboard.schemaVersion) findings.push("Dashboard 缺少 schemaVersion。");
  if (panels.length === 0) findings.push("未找到 panels。");

  panels.forEach((panel) => {
    if (typeof panel.id === "number") {
      if (ids.has(panel.id)) duplicates.add(panel.id);
      ids.add(panel.id);
    }

    if (!panel.title) findings.push(`Panel ${panel.id ?? "(no id)"} 缺少 title。`);
    if (!panel.datasource) findings.push(`Panel ${panel.title ?? panel.id ?? "(unknown)"} 缺少 datasource。`);
    if (!panel.targets || panel.targets.length === 0) findings.push(`Panel ${panel.title ?? panel.id ?? "(unknown)"} 没有 targets。`);
  });

  duplicates.forEach((id) => findings.push(`Panel id ${id} 重复。`));

  return findings;
}

function panelInventory(dashboard: GrafanaDashboard) {
  const panels = flattenPanels(dashboard.panels);

  return panels.map((panel) => {
    const targets = panel.targets?.map((target) => target.expr || target.query || target.refId || "空").join(" | ") || "无目标";

    return `${panel.id ?? "-"}\t${panel.type ?? "未知"}\t${panel.title ?? "未命名"}\t${targets}`;
  }).join("\n");
}

function buildOutput(source: string, mode: OutputMode) {
  const dashboard = parseDashboard(source);
  if (mode === "compact") return JSON.stringify(dashboard);
  if (mode === "inventory") return `ID\t类型\t标题\t目标\n${panelInventory(dashboard)}`;

  return JSON.stringify(dashboard, null, 2);
}

export default function GrafanaDashboardFormatterTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleDashboard);
  const [mode, setMode] = useState<OutputMode>("pretty");
  const [error, setError] = useState("");
  const output = useMemo(() => {
    try {
      return buildOutput(source, mode);
    } catch {
      return "";
    }
  }, [source, mode]);
  const dashboard = useMemo(() => {
    try {
      return parseDashboard(source);
    } catch {
      return null;
    }
  }, [source]);
  const panels = dashboard ? flattenPanels(dashboard.panels) : [];
  const findings = dashboard ? validateDashboard(dashboard) : ["JSON 解析失败。"];

  function formatSource(nextMode: OutputMode) {
    try {
      setMode(nextMode);
      setError("");
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "Dashboard 处理失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Grafana 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => formatSource("pretty")}>格式化</button>
        <button type="button" onClick={() => formatSource("compact")}>压缩</button>
        <button type="button" onClick={() => formatSource("inventory")}>面板清单</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>仪表盘 JSON</span>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>标题</h3>
          <p>{dashboard?.title ?? "无效"}</p>
        </article>
        <article className="detail-card">
          <h3>面板数</h3>
          <p>{panels.length}</p>
        </article>
        <article className="detail-card">
          <h3>Schema 版本</h3>
          <p>{dashboard?.schemaVersion ?? "缺失"}</p>
        </article>
        <article className="detail-card">
          <h3>问题数</h3>
          <p>{findings.length}</p>
        </article>
      </div>
      <article className="detail-card">
        <h3>导入检查</h3>
        <ul className="compact-list">
          {findings.length > 0 ? findings.map((finding) => <li key={finding}>{finding}</li>) : <li>未发现常见导入问题。</li>}
        </ul>
      </article>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
