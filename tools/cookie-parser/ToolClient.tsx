"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Mode = "set-cookie" | "cookie";
type Severity = "info" | "low" | "medium" | "high";

interface CookiePair {
  name: string;
  value: string;
}

interface ParsedSetCookie extends CookiePair {
  attributes: Record<string, string | true>;
  raw: string;
}

interface Finding {
  cookie: string;
  severity: Severity;
  message: string;
}

const sampleSetCookie = [
  "Set-Cookie: sid=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
  "Set-Cookie: prefs=theme%3Ddark; Path=/; SameSite=None"
].join("\n");
const sampleCookie = "Cookie: sid=abc123; prefs=theme%3Ddark; feature=beta";

const severityLabels: Record<Severity, string> = {
  info: "提示",
  low: "低",
  medium: "中",
  high: "高"
};

function stripHeaderPrefix(line: string, mode: Mode) {
  const prefix = mode === "set-cookie" ? /^set-cookie:\s*/i : /^cookie:\s*/i;

  return line.trim().replace(prefix, "");
}

function splitCookieParts(input: string) {
  const parts: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of input) {
    if (char === "\"") {
      quoted = !quoted;
    }

    if (char === ";" && !quoted) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function splitSetCookieLines(input: string) {
  return input.split(/\r?\n/)
    .flatMap((line) => stripHeaderPrefix(line, "set-cookie").split(/,(?=\s*[^;,=\s]+=[^;,\s]*)/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNameValue(part: string): CookiePair {
  const index = part.indexOf("=");

  if (index === -1) {
    return { name: part.trim(), value: "" };
  }

  return {
    name: part.slice(0, index).trim(),
    value: part.slice(index + 1).trim()
  };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseSetCookie(input: string): ParsedSetCookie[] {
  return splitSetCookieLines(input).map((line) => {
    const parts = splitCookieParts(line);
    const first = parseNameValue(parts[0] ?? "");
    const attributes: Record<string, string | true> = {};

    for (const attribute of parts.slice(1)) {
      const pair = parseNameValue(attribute);

      attributes[pair.name.toLowerCase()] = pair.value || true;
    }

    return {
      ...first,
      attributes,
      raw: line
    };
  }).filter((cookie) => cookie.name);
}

function parseCookieHeader(input: string): CookiePair[] {
  return splitCookieParts(stripHeaderPrefix(input.replace(/\r?\n/g, "; "), "cookie"))
    .map(parseNameValue)
    .filter((cookie) => cookie.name);
}

function hasAttribute(cookie: ParsedSetCookie, name: string) {
  return Object.prototype.hasOwnProperty.call(cookie.attributes, name.toLowerCase());
}

function attrValue(cookie: ParsedSetCookie, name: string) {
  const value = cookie.attributes[name.toLowerCase()];

  return typeof value === "string" ? value : "";
}

function isSessionLike(name: string) {
  return /(sid|session|auth|token|jwt|refresh|access|csrf)/i.test(name);
}

function expiryDays(cookie: ParsedSetCookie) {
  const maxAge = Number(attrValue(cookie, "max-age"));

  if (Number.isFinite(maxAge) && maxAge > 0) {
    return maxAge / 86400;
  }

  const expires = attrValue(cookie, "expires");
  const timestamp = Date.parse(expires);

  if (Number.isFinite(timestamp)) {
    return (timestamp - Date.now()) / 86400000;
  }

  return 0;
}

function diagnose(cookies: ParsedSetCookie[]): Finding[] {
  const findings: Finding[] = [];

  for (const cookie of cookies) {
    const secure = hasAttribute(cookie, "secure");
    const httpOnly = hasAttribute(cookie, "httponly");
    const sameSite = attrValue(cookie, "samesite").toLowerCase();
    const days = expiryDays(cookie);

    if (!secure) {
      findings.push({ cookie: cookie.name, severity: "high", message: "缺少 Secure，HTTPS 页面外可能泄露 Cookie。" });
    }

    if (isSessionLike(cookie.name) && !httpOnly) {
      findings.push({ cookie: cookie.name, severity: "high", message: "会话类 Cookie 缺少 HttpOnly，脚本可读取。" });
    } else if (!httpOnly) {
      findings.push({ cookie: cookie.name, severity: "medium", message: "缺少 HttpOnly；如无需前端读取，建议开启。" });
    }

    if (!sameSite) {
      findings.push({ cookie: cookie.name, severity: "medium", message: "缺少 SameSite，跨站请求风险更难控制。" });
    }

    if (sameSite === "none" && !secure) {
      findings.push({ cookie: cookie.name, severity: "high", message: "SameSite=None 必须配合 Secure。" });
    }

    if (days > 400) {
      findings.push({ cookie: cookie.name, severity: "low", message: "过期时间约 " + Math.round(days) + " 天，建议确认是否需要长期有效。" });
    }

    if (cookie.name.startsWith("__Host-")) {
      if (!secure || attrValue(cookie, "path") !== "/" || hasAttribute(cookie, "domain")) {
        findings.push({ cookie: cookie.name, severity: "high", message: "__Host- 前缀要求 Secure、Path=/ 且不能设置 Domain。" });
      }
    }

    if (cookie.name.startsWith("__Secure-") && !secure) {
      findings.push({ cookie: cookie.name, severity: "high", message: "__Secure- 前缀要求 Secure。" });
    }

    if (hasAttribute(cookie, "partitioned") && !secure) {
      findings.push({ cookie: cookie.name, severity: "medium", message: "Partitioned Cookie 应同时设置 Secure。" });
    }
  }

  return findings;
}

function severityRank(severity: Severity) {
  return severity === "high" ? 4 : severity === "medium" ? 3 : severity === "low" ? 2 : 1;
}

function formatAttributes(cookie: ParsedSetCookie) {
  return Object.entries(cookie.attributes).map(([key, value]) => key + (value === true ? "" : "=" + value)).join("; ") || "无属性";
}

export default function CookieParserTool({ manifest }: ToolClientProps) {
  const [mode, setMode] = useState<Mode>("set-cookie");
  const [input, setInput] = useState(sampleSetCookie);
  const setCookies = useMemo(() => parseSetCookie(input), [input]);
  const requestCookies = useMemo(() => parseCookieHeader(input), [input]);
  const findings = useMemo(() => diagnose(setCookies).sort((left, right) => severityRank(right.severity) - severityRank(left.severity)), [setCookies]);
  const cookies = mode === "set-cookie" ? setCookies : requestCookies;
  const highCount = findings.filter((finding) => finding.severity === "high").length;

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setInput(nextMode === "set-cookie" ? sampleSetCookie : sampleCookie);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">HTTP Cookie 分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>解析模式</span>
          <select value={mode} onChange={(event) => changeMode(event.target.value as Mode)}>
            <option value="set-cookie">响应 Set-Cookie</option>
            <option value="cookie">请求 Cookie</option>
          </select>
        </label>
      </div>

      <label className="tool-field">
        <span>{mode === "set-cookie" ? "Set-Cookie Headers" : "Cookie Header"}</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Cookie 数</h3>
          <p>{cookies.length}</p>
        </article>
        <article className="detail-card">
          <h3>诊断项</h3>
          <p>{mode === "set-cookie" ? findings.length : "不适用"}</p>
        </article>
        <article className="detail-card">
          <h3>高风险</h3>
          <p>{mode === "set-cookie" ? highCount : "不适用"}</p>
        </article>
      </div>

      {mode === "set-cookie" ? (
        <>
          <div className="tool-table cookie-table">
            <div className="tool-table__row tool-table__row--head cookie-table__row">
              <span>名称</span>
              <span>解码值</span>
              <span>属性</span>
            </div>
            {setCookies.map((cookie) => (
              <div key={cookie.raw} className="tool-table__row cookie-table__row">
                <span className="mono-output">{cookie.name}</span>
                <span className="mono-output">{safeDecode(cookie.value)}</span>
                <span className="mono-output">{formatAttributes(cookie)}</span>
              </div>
            ))}
          </div>

          <div className="tool-table finding-table">
            <div className="tool-table__row tool-table__row--head finding-table__row">
              <span>Cookie</span>
              <span>级别</span>
              <span>建议</span>
            </div>
            {findings.length > 0 ? findings.map((finding, index) => (
              <div key={finding.cookie + "-" + finding.message + "-" + index} className="tool-table__row finding-table__row">
                <span className="mono-output">{finding.cookie}</span>
                <span><span className="tag">{severityLabels[finding.severity]}</span></span>
                <span>{finding.message}</span>
              </div>
            )) : (
              <div className="tool-table__row finding-table__row">
                <span>-</span>
                <span>通过</span>
                <span>未发现常见 Flags 问题。</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="tool-table request-cookie-table">
          <div className="tool-table__row tool-table__row--head request-cookie-table__row">
            <span>名称</span>
            <span>解码值</span>
          </div>
          {requestCookies.map((cookie) => (
            <div key={cookie.name} className="tool-table__row request-cookie-table__row">
              <span className="mono-output">{cookie.name}</span>
              <span className="mono-output">{safeDecode(cookie.value)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="tool-note">诊断结果覆盖常见 Cookie Flags，不替代完整会话安全审计；Set-Cookie 的真实行为还会受到域名、路径和浏览器策略影响。</p>
    </section>
  );
}
