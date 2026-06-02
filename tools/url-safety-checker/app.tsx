"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type IssueSeverity = "low" | "medium" | "high";

interface UrlIssue {
  severity: IssueSeverity;
  message: string;
}

const severityLabels: Record<IssueSeverity, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const shortenerHosts = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "cutt.ly",
  "rebrand.ly"
]);

function parseUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL 不能为空");
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return new URL(candidate);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;

  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || first === 127
    || (first === 169 && second === 254)
    || first === 0;
}

function isPrivateIpv6Literal(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!normalized.includes(":")) {
    return false;
  }

  return normalized === "::1"
    || /^fe[89ab][0-9a-f]:/.test(normalized)
    || /^f[cd][0-9a-f]{2}:/.test(normalized);
}

function isPrivateHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return normalized === "localhost"
    || normalized.endsWith(".local")
    || isPrivateIpv6Literal(normalized)
    || isPrivateIpv4(normalized);
}

function addIssue(issues: UrlIssue[], severity: IssueSeverity, message: string) {
  issues.push({ severity, message });
}

function analyzeUrl(input: string) {
  const url = parseUrl(input);
  const issues: UrlIssue[] = [];
  const hostname = url.hostname.toLowerCase();
  const raw = input.trim();

  if (!["https:", "http:"].includes(url.protocol)) {
    addIssue(issues, "high", "URL 使用非 HTTP(S) 协议，浏览器或应用打开时风险更高。");
  } else if (url.protocol === "http:") {
    addIssue(issues, "medium", "HTTP 明文传输可能被篡改或监听。");
  }

  if (url.username || url.password) {
    addIssue(issues, "high", "URL 中包含用户名或密码，常见于钓鱼混淆。");
  }

  if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
    addIssue(issues, "medium", "域名包含 Punycode，需要检查是否存在同形字混淆。");
  }

  if (isPrivateHost(hostname)) {
    addIssue(issues, "high", "目标指向 localhost、私网或链路本地地址，服务端请求时可能形成 SSRF。");
  }

  if (shortenerHosts.has(hostname)) {
    addIssue(issues, "medium", "短链会隐藏真实目标，访问前需要展开验证。");
  }

  if (raw.length > 180) {
    addIssue(issues, "low", "URL 很长，可能隐藏重定向、追踪参数或混淆片段。");
  }

  if ((hostname.match(/\./g) ?? []).length >= 4) {
    addIssue(issues, "low", "子域层级较深，建议确认注册域和实际组织。");
  }

  if (/%0[0-9a-f]|%2f|%5c/i.test(raw)) {
    addIssue(issues, "medium", "URL 包含控制字符或编码斜杠，后端解析可能与浏览器不一致。");
  }

  if (/[а-яё]/i.test(raw)) {
    addIssue(issues, "medium", "URL 含西里尔字符，可能用于视觉混淆。");
  }

  if (/(login|verify|account|wallet|password|invoice|payment).*(free|bonus|urgent|secure|update)/i.test(raw)) {
    addIssue(issues, "medium", "路径或域名含常见钓鱼诱导词组合。");
  }

  const queryCount = Array.from(url.searchParams.keys()).length;
  if (queryCount > 8) {
    addIssue(issues, "low", "查询参数较多，建议检查跳转、追踪和开放重定向参数。");
  }

  const score = Math.max(0, 100 - issues.reduce((total, issue) => total + (issue.severity === "high" ? 30 : issue.severity === "medium" ? 15 : 5), 0));

  return { url, issues, score };
}

function scoreLabel(score: number) {
  if (score >= 85) return "可观察风险较低";
  if (score >= 55) return "建议复核";
  return "存在高风险信号";
}

export default function UrlSafetyCheckerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("https://login.example.com/account/update?next=https%3A%2F%2Fexample.com");
  const result = useMemo(() => {
    try {
      return { analysis: analyzeUrl(input), error: "" };
    } catch (error) {
      return { analysis: null, error: error instanceof Error ? error.message : "URL 解析失败" };
    }
  }, [input]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络安全</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <label className="tool-field">
        <span>URL</span>
        <input value={input} onChange={(event) => setInput(event.target.value)} />
      </label>

      {result.analysis ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>分数</h3>
              <p>{result.analysis.score}</p>
            </article>
            <article className="detail-card">
              <h3>状态</h3>
              <p>{scoreLabel(result.analysis.score)}</p>
            </article>
            <article className="detail-card">
              <h3>主机</h3>
              <p>{result.analysis.url.hostname || "无"}</p>
            </article>
            <article className="detail-card">
              <h3>协议</h3>
              <p>{result.analysis.url.protocol}</p>
            </article>
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>组成部分</span>
              <span>值</span>
            </div>
            {[
              ["来源", result.analysis.url.origin],
              ["路径", result.analysis.url.pathname],
              ["查询参数", String(Array.from(result.analysis.url.searchParams.keys()).length)],
              ["Hash", result.analysis.url.hash || "无"]
            ].map(([label, value]) => (
              <div key={label} className="tool-table__row">
                <span>{label}</span>
                <span className="mono-output">{value}</span>
              </div>
            ))}
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>严重级别</span>
              <span>问题</span>
            </div>
            {result.analysis.issues.length > 0 ? result.analysis.issues.map((issue) => (
              <div key={issue.message} className="tool-table__row">
                <span>{severityLabels[issue.severity]}</span>
                <span>{issue.message}</span>
              </div>
            )) : (
              <div className="tool-table__row">
                <span>无</span>
                <span>未发现明显结构性风险信号。</span>
              </div>
            )}
          </div>
          <p className="tool-note">本地检查不访问目标地址，也不进行恶意域名信誉查询。</p>
        </>
      ) : (
        <p className="tool-error">{result.error}</p>
      )}
    </section>
  );
}
