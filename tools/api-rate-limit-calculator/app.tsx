"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function calculateRateLimit(users: number, requestsPerUser: number, windowSeconds: number, peakMultiplier: number, safetyMargin: number) {
  const steadyPerSecond = (users * requestsPerUser) / windowSeconds;
  const peakPerSecond = steadyPerSecond * peakMultiplier;
  const recommended = Math.ceil(peakPerSecond * (1 + safetyMargin / 100));
  const burst = Math.ceil(recommended * Math.max(1, peakMultiplier));
  const retryAfter = Math.ceil(windowSeconds / Math.max(1, requestsPerUser));

  return {
    steadyPerSecond,
    peakPerSecond,
    recommended,
    burst,
    retryAfter,
    perMinute: recommended * 60,
    perHour: recommended * 3600
  };
}

function nginxSnippet(rate: ReturnType<typeof calculateRateLimit>, key: string) {
  return `limit_req_zone ${key} zone=api_limit:10m rate=${rate.recommended}r/s;

server {
  location /api/ {
    limit_req zone=api_limit burst=${rate.burst} nodelay;
    add_header Retry-After ${rate.retryAfter} always;
  }
}`;
}

function expressSnippet(rate: ReturnType<typeof calculateRateLimit>) {
  return `rateLimit({
  windowMs: 60_000,
  limit: ${rate.perMinute},
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", retryAfter: ${rate.retryAfter} }
});`;
}

export default function ApiRateLimitCalculatorTool({ manifest }: ToolAppProps) {
  const [users, setUsers] = useState(2500);
  const [requestsPerUser, setRequestsPerUser] = useState(120);
  const [windowSeconds, setWindowSeconds] = useState(3600);
  const [peakMultiplier, setPeakMultiplier] = useState(3);
  const [safetyMargin, setSafetyMargin] = useState(20);
  const [key, setKey] = useState("$binary_remote_addr");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const rate = useMemo(() => calculateRateLimit(users, requestsPerUser, windowSeconds, peakMultiplier, safetyMargin), [peakMultiplier, requestsPerUser, safetyMargin, users, windowSeconds]);
  const nginx = nginxSnippet(rate, key);
  const express = expressSnippet(rate);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
      setTimeout(() => setCopied(""), 2000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">后端</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>活跃用户</span>
          <input type="number" min="1" value={users} onChange={(event) => setUsers(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>每用户请求</span>
          <input type="number" min="1" value={requestsPerUser} onChange={(event) => setRequestsPerUser(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>窗口秒数</span>
          <input type="number" min="1" value={windowSeconds} onChange={(event) => setWindowSeconds(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>限流 key</span>
          <input value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>峰值倍数 {peakMultiplier.toFixed(1)}x</span>
          <input type="range" min="1" max="10" step="0.1" value={peakMultiplier} onChange={(event) => setPeakMultiplier(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>安全余量 {safetyMargin}%</span>
          <input type="range" min="0" max="100" value={safetyMargin} onChange={(event) => setSafetyMargin(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copy("nginx", nginx)}>{copied === "nginx" ? "已复制" : "复制 NGINX"}</button>
        <button type="button" onClick={() => void copy("express", express)}>{copied === "express" ? "已复制" : "复制 Express"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>稳态 RPS</h3><p>{rate.steadyPerSecond.toFixed(2)}</p></article>
        <article className="detail-card"><h3>峰值 RPS</h3><p>{rate.peakPerSecond.toFixed(2)}</p></article>
        <article className="detail-card"><h3>限制</h3><p>{rate.recommended} r/s</p></article>
        <article className="detail-card"><h3>突发</h3><p>{rate.burst}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>NGINX</span>
          <textarea value={nginx} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Express / Node</span>
          <textarea value={express} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">限流阈值应按真实流量分布、租户等级和端点成本拆分；登录、支付、AI 调用等高成本接口建议单独配置更严格的 key 和配额。</p>
    </section>
  );
}
