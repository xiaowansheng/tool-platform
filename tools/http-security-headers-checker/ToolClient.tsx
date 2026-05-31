"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type CheckSeverity = "low" | "medium" | "high";

interface HeaderEntry {
  name: string;
  value: string;
}

interface HeaderCheck {
  name: string;
  severity: CheckSeverity;
  passed: boolean;
  detail: string;
  action: string;
}

const sampleHeaders = `HTTP/2 200
content-security-policy: default-src self; object-src none; frame-ancestors none
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
set-cookie: sid=abc; HttpOnly; Secure; SameSite=Lax`;

function parseHeaders(input: string) {
  const entries: HeaderEntry[] = [];

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^HTTP\/\d(?:\.\d)?\s+\d+/.test(trimmed)) continue;

    const index = trimmed.indexOf(":");
    if (index === -1) continue;

    entries.push({
      name: trimmed.slice(0, index).trim(),
      value: trimmed.slice(index + 1).trim()
    });
  }

  return entries;
}

function getHeader(entries: HeaderEntry[], name: string) {
  return entries.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function getHeaders(entries: HeaderEntry[], name: string) {
  return entries.filter((entry) => entry.name.toLowerCase() === name.toLowerCase()).map((entry) => entry.value);
}

function checkHeaders(entries: HeaderEntry[]): HeaderCheck[] {
  const csp = getHeader(entries, "content-security-policy");
  const hsts = getHeader(entries, "strict-transport-security");
  const xcto = getHeader(entries, "x-content-type-options");
  const xfo = getHeader(entries, "x-frame-options");
  const referrer = getHeader(entries, "referrer-policy");
  const permissions = getHeader(entries, "permissions-policy");
  const coop = getHeader(entries, "cross-origin-opener-policy");
  const corp = getHeader(entries, "cross-origin-resource-policy");
  const cookies = getHeaders(entries, "set-cookie");
  const hstsMaxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? "0");
  const cookieFlagsOk = cookies.length === 0 || cookies.every((cookie) =>
    /;\s*secure/i.test(cookie) && /;\s*httponly/i.test(cookie) && /;\s*samesite=(lax|strict|none)/i.test(cookie)
  );

  return [
    {
      name: "Content-Security-Policy",
      severity: "high",
      passed: Boolean(csp) && /default-src/i.test(csp) && /object-src\s+none|object-src\s+none/i.test(csp) && !/unsafe-inline|unsafe-eval/i.test(csp),
      detail: csp || "缺失",
      action: "设置 default-src，禁用 object-src，并尽量移除 unsafe-inline / unsafe-eval。"
    },
    {
      name: "Strict-Transport-Security",
      severity: "high",
      passed: hstsMaxAge >= 15552000,
      detail: hsts || "缺失",
      action: "HTTPS 站点设置 max-age 至少 15552000，生产环境通常使用 includeSubDomains。"
    },
    {
      name: "X-Content-Type-Options",
      severity: "medium",
      passed: xcto.toLowerCase() === "nosniff",
      detail: xcto || "缺失",
      action: "设置 X-Content-Type-Options: nosniff。"
    },
    {
      name: "Clickjacking protection",
      severity: "medium",
      passed: /frame-ancestors/i.test(csp) || /^(DENY|SAMEORIGIN)$/i.test(xfo),
      detail: xfo || (csp ? "CSP 中包含 frame-ancestors" : "缺失"),
      action: "使用 CSP frame-ancestors 或 X-Frame-Options 限制页面嵌入。"
    },
    {
      name: "Referrer-Policy",
      severity: "low",
      passed: /^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/i.test(referrer),
      detail: referrer || "缺失",
      action: "设置 no-referrer、same-origin 或 strict-origin-when-cross-origin。"
    },
    {
      name: "Permissions-Policy",
      severity: "low",
      passed: Boolean(permissions) && !/\*=/.test(permissions),
      detail: permissions || "缺失",
      action: "显式关闭未使用的浏览器能力，例如 camera=(), microphone=(), geolocation=()。"
    },
    {
      name: "Cross-Origin-Opener-Policy",
      severity: "low",
      passed: /^same-origin/i.test(coop),
      detail: coop || "缺失",
      action: "需要跨源隔离或降低 opener 风险时设置 same-origin。"
    },
    {
      name: "Cross-Origin-Resource-Policy",
      severity: "low",
      passed: /^(same-origin|same-site|cross-origin)$/i.test(corp),
      detail: corp || "缺失",
      action: "根据资源共享模型设置 same-origin、same-site 或 cross-origin。"
    },
    {
      name: "Set-Cookie flags",
      severity: "high",
      passed: cookieFlagsOk,
      detail: cookies.length ? cookies.join(" / ") : "未观察到 Cookie",
      action: "会话 Cookie 应包含 Secure、HttpOnly 和 SameSite。"
    }
  ];
}

function scoreChecks(checks: HeaderCheck[]) {
  const penalty = checks.reduce((total, check) => {
    if (check.passed) return total;
    return total + (check.severity === "high" ? 18 : check.severity === "medium" ? 12 : 6);
  }, 0);

  return Math.max(0, 100 - penalty);
}

function severityLabel(severity: CheckSeverity) {
  if (severity === "high") return "高";
  if (severity === "medium") return "中";
  return "低";
}

export default function HttpSecurityHeadersCheckerTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleHeaders);
  const entries = useMemo(() => parseHeaders(input), [input]);
  const checks = useMemo(() => checkHeaders(entries), [entries]);
  const score = scoreChecks(checks);
  const failed = checks.filter((check) => !check.passed);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">HTTP 加固</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => setInput(sampleHeaders)}>填入示例响应头</button>
      </div>

      <label className="tool-field">
        <span>原始响应头</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>安全评分</h3>
          <p>{score}</p>
        </article>
        <article className="detail-card">
          <h3>响应头数</h3>
          <p>{entries.length}</p>
        </article>
        <article className="detail-card">
          <h3>通过项</h3>
          <p>{checks.length - failed.length}</p>
        </article>
        <article className="detail-card">
          <h3>待处理</h3>
          <p>{failed.length}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>检查项</span>
          <span>结果与建议</span>
        </div>
        {checks.map((check) => (
          <div key={check.name} className="tool-table__row">
            <span>
              <strong>{check.name}</strong><br />
              <span className="tag">{severityLabel(check.severity)}</span>
            </span>
            <span>
              <span className="tag">{check.passed ? "通过" : "需复核"}</span> <span className="mono-output">{check.detail}</span><br />
              {!check.passed ? check.action : "当前配置覆盖了该检查项。"}
            </span>
          </div>
        ))}
      </div>
      <p className="tool-note">评分用于快速排查，不替代正式安全评审；请结合业务是否允许嵌入、跨源资源和第三方脚本来调整策略。</p>
    </section>
  );
}
