"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Incident {
  id: string;
  name: string;
  minutes: number;
  badRequests: number;
}

const initialIncidents: Incident[] = [
  { id: "1", name: "API 5xx spike", minutes: 18, badRequests: 12000 },
  { id: "2", name: "Regional latency", minutes: 9, badRequests: 2800 }
];

function periodMinutes(days: number) {
  return days * 24 * 60;
}

function formatMinutes(value: number) {
  if (value < 60) return `${value.toFixed(1)} min`;
  return `${(value / 60).toFixed(2)} h`;
}

function calculate(input: {
  slo: number;
  days: number;
  requests: number;
  incidents: Incident[];
}) {
  const totalMinutes = periodMinutes(input.days);
  const errorBudgetRatio = Math.max(0, (100 - input.slo) / 100);
  const budgetMinutes = totalMinutes * errorBudgetRatio;
  const budgetBadRequests = input.requests * errorBudgetRatio;
  const usedMinutes = input.incidents.reduce((sum, incident) => sum + incident.minutes, 0);
  const usedBadRequests = input.incidents.reduce((sum, incident) => sum + incident.badRequests, 0);
  const remainingMinutes = budgetMinutes - usedMinutes;
  const remainingRequests = budgetBadRequests - usedBadRequests;
  const minuteBurn = budgetMinutes > 0 ? usedMinutes / budgetMinutes : 0;
  const requestBurn = budgetBadRequests > 0 ? usedBadRequests / budgetBadRequests : 0;
  const burn = Math.max(minuteBurn, requestBurn);

  return {
    totalMinutes,
    budgetMinutes,
    budgetBadRequests,
    usedMinutes,
    usedBadRequests,
    remainingMinutes,
    remainingRequests,
    minuteBurn,
    requestBurn,
    burn,
    releaseRisk: burn >= 1 ? "freeze" : burn >= 0.75 ? "high" : burn >= 0.5 ? "medium" : "low"
  };
}

function buildReport(slo: number, days: number, requests: number, result: ReturnType<typeof calculate>) {
  return [
    `SLO: ${slo}% over ${days} days`,
    `Traffic: ${requests.toLocaleString()} requests`,
    `Time budget: ${formatMinutes(result.budgetMinutes)}`,
    `Request budget: ${Math.round(result.budgetBadRequests).toLocaleString()} bad requests`,
    `Used: ${formatMinutes(result.usedMinutes)} / ${Math.round(result.usedBadRequests).toLocaleString()} bad requests`,
    `Remaining: ${formatMinutes(result.remainingMinutes)} / ${Math.round(result.remainingRequests).toLocaleString()} bad requests`,
    `Burn: ${(result.burn * 100).toFixed(1)}%`,
    `Release risk: ${result.releaseRisk}`
  ].join("\n");
}

export default function SloErrorBudgetCalculatorTool({ manifest }: ToolAppProps) {
  const [slo, setSlo] = useState(99.9);
  const [days, setDays] = useState(30);
  const [requests, setRequests] = useState(25_000_000);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => calculate({ slo, days, requests, incidents }), [days, incidents, requests, slo]);
  const report = useMemo(() => buildReport(slo, days, requests, result), [days, requests, result, slo]);

  function updateIncident(id: string, patch: Partial<Incident>) {
    setIncidents((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    setCopied(false);
  }

  function addIncident() {
    setIncidents((items) => [
      ...items,
      {
        id: crypto.randomUUID?.() ?? `incident-${Date.now()}`,
        name: "New incident",
        minutes: 0,
        badRequests: 0
      }
    ]);
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">可靠性</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>SLO %</span>
          <input type="number" min="90" max="99.999" step="0.001" value={slo} onChange={(event) => setSlo(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>周期天数</span>
          <input type="number" min="1" max="365" value={days} onChange={(event) => setDays(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>周期请求量</span>
          <input type="number" min="0" value={requests} onChange={(event) => setRequests(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyReport()}>{copied ? "已复制" : "复制报告"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>时间预算</h3>
          <p>{formatMinutes(result.budgetMinutes)}</p>
        </article>
        <article className="detail-card">
          <h3>已使用</h3>
          <p>{(result.burn * 100).toFixed(1)}%</p>
        </article>
        <article className="detail-card">
          <h3>剩余</h3>
          <p>{formatMinutes(result.remainingMinutes)}</p>
        </article>
        <article className="detail-card">
          <h3>风险</h3>
          <p>{result.releaseRisk}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <div className="tool-toolbar">
            <button type="button" onClick={addIncident}>新增事故</button>
            <button type="button" onClick={() => setIncidents(initialIncidents)}>重置示例</button>
          </div>

          {incidents.map((incident) => (
            <div className="tool-toolbar tool-toolbar--grid" key={incident.id}>
              <label className="tool-field tool-field--compact">
                <span>事故</span>
                <input value={incident.name} onChange={(event) => updateIncident(incident.id, { name: event.target.value })} />
              </label>
              <label className="tool-field tool-field--compact">
                <span>分钟</span>
                <input type="number" min="0" value={incident.minutes} onChange={(event) => updateIncident(incident.id, { minutes: Number(event.target.value) })} />
              </label>
              <label className="tool-field tool-field--compact">
                <span>失败请求</span>
                <input type="number" min="0" value={incident.badRequests} onChange={(event) => updateIncident(incident.id, { badRequests: Number(event.target.value) })} />
              </label>
              <button type="button" className="button--danger" onClick={() => setIncidents((items) => items.filter((item) => item.id !== incident.id))}>删除</button>
            </div>
          ))}
        </div>

        <label className="tool-field">
          <span>预算报告</span>
          <textarea value={report} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">时间预算和请求预算是两种常见视角；真实发布决策还应结合多窗口 burn rate、用户影响面和当前修复置信度。</p>
    </section>
  );
}
