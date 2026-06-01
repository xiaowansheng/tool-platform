"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type ProbeType = "httpGet" | "tcpSocket" | "exec";

function indent(value: string, spaces: number) {
  const prefix = " ".repeat(spaces);
  return value.split("\n").map((line) => `${prefix}${line}`).join("\n");
}

function buildProbeYaml(input: {
  type: ProbeType;
  path: string;
  port: number;
  command: string;
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold: number;
}) {
  const body = [];

  if (input.type === "httpGet") {
    body.push("httpGet:", `  path: ${input.path || "/healthz"}`, `  port: ${input.port}`);
  }

  if (input.type === "tcpSocket") {
    body.push("tcpSocket:", `  port: ${input.port}`);
  }

  if (input.type === "exec") {
    body.push("exec:", "  command:");
    for (const part of input.command.split(/\s+/).filter(Boolean)) {
      body.push(`    - ${JSON.stringify(part)}`);
    }
  }

  body.push(
    `initialDelaySeconds: ${input.initialDelaySeconds}`,
    `periodSeconds: ${input.periodSeconds}`,
    `timeoutSeconds: ${input.timeoutSeconds}`,
    `failureThreshold: ${input.failureThreshold}`,
    `successThreshold: ${input.successThreshold}`
  );

  return body.join("\n");
}

function analyzeWindow(periodSeconds: number, timeoutSeconds: number, failureThreshold: number, initialDelaySeconds: number) {
  const failureWindow = initialDelaySeconds + Math.max(periodSeconds, timeoutSeconds) * failureThreshold;
  const detectionAfterStarted = Math.max(periodSeconds, timeoutSeconds) * failureThreshold;

  return {
    failureWindow,
    detectionAfterStarted,
    restartsPerHourWorstCase: Math.floor(3600 / Math.max(1, detectionAfterStarted))
  };
}

export default function KubernetesProbeBuilderTool({ manifest }: ToolClientProps) {
  const [type, setType] = useState<ProbeType>("httpGet");
  const [path, setPath] = useState("/healthz");
  const [port, setPort] = useState(8080);
  const [command, setCommand] = useState("cat /tmp/healthy");
  const [initialDelaySeconds, setInitialDelaySeconds] = useState(10);
  const [periodSeconds, setPeriodSeconds] = useState(10);
  const [timeoutSeconds, setTimeoutSeconds] = useState(2);
  const [failureThreshold, setFailureThreshold] = useState(3);
  const [successThreshold, setSuccessThreshold] = useState(1);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const probeBody = useMemo(() => buildProbeYaml({
    type,
    path,
    port,
    command,
    initialDelaySeconds,
    periodSeconds,
    timeoutSeconds,
    failureThreshold,
    successThreshold
  }), [command, failureThreshold, initialDelaySeconds, path, periodSeconds, port, successThreshold, timeoutSeconds, type]);
  const windows = useMemo(() => analyzeWindow(periodSeconds, timeoutSeconds, failureThreshold, initialDelaySeconds), [failureThreshold, initialDelaySeconds, periodSeconds, timeoutSeconds]);
  const yaml = `livenessProbe:\n${indent(probeBody, 2)}\n\nreadinessProbe:\n${indent(probeBody.replace(`successThreshold: ${successThreshold}`, "successThreshold: 1"), 2)}\n\nstartupProbe:\n${indent(probeBody.replace(`failureThreshold: ${failureThreshold}`, `failureThreshold: ${Math.max(failureThreshold, 12)}`), 2)}\n`;
  const risks = [
    timeoutSeconds >= periodSeconds ? "timeoutSeconds 不应大于或等于 periodSeconds，否则探针可能堆积。" : "",
    initialDelaySeconds < 5 ? "initialDelaySeconds 很短，慢启动服务可能被过早重启。" : "",
    type === "httpGet" && !path.startsWith("/") ? "HTTP path 应以 / 开头。" : "",
    successThreshold > 1 ? "Kubernetes liveness/startup probe 的 successThreshold 必须为 1。" : ""
  ].filter(Boolean);

  async function copyYaml() {
    try {
      await navigator.clipboard.writeText(yaml);
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
          <p className="eyebrow">运维工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>类型</span>
          <select value={type} onChange={(event) => setType(event.target.value as ProbeType)}>
            <option value="httpGet">HTTP GET</option>
            <option value="tcpSocket">TCP Socket</option>
            <option value="exec">执行命令</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact"><span>端口</span><input type="number" min="1" max="65535" value={port} onChange={(event) => setPort(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>HTTP 路径</span><input value={path} onChange={(event) => setPath(event.target.value)} disabled={type !== "httpGet"} /></label>
        <button type="button" onClick={() => void copyYaml()}>{copied ? "已复制" : "复制 YAML"}</button>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>初始延迟</span><input type="number" min="0" value={initialDelaySeconds} onChange={(event) => setInitialDelaySeconds(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>周期</span><input type="number" min="1" value={periodSeconds} onChange={(event) => setPeriodSeconds(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>超时</span><input type="number" min="1" value={timeoutSeconds} onChange={(event) => setTimeoutSeconds(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>失败阈值</span><input type="number" min="1" value={failureThreshold} onChange={(event) => setFailureThreshold(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>成功阈值</span><input type="number" min="1" value={successThreshold} onChange={(event) => setSuccessThreshold(Number(event.target.value))} /></label>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>失败窗口</h3><p>{windows.failureWindow}s</p></article>
        <article className="detail-card"><h3>启动后检测</h3><p>{windows.detectionAfterStarted}s</p></article>
        <article className="detail-card"><h3>最差重启/小时</h3><p>{windows.restartsPerHourWorstCase}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Exec 命令</span>
            <input value={command} onChange={(event) => setCommand(event.target.value)} disabled={type !== "exec"} />
          </label>
          {risks.map((risk) => <p className="tool-error" key={risk}>{risk}</p>)}
          <p className="tool-note">startupProbe 通过后才会启用 liveness/readiness；慢启动应用建议先放宽 startupProbe，而不是放宽 livenessProbe。</p>
        </div>
        <label className="tool-field">
          <span>探针 YAML</span>
          <textarea value={yaml} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
