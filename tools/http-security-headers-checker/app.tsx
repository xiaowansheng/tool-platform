"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

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

// Case insensitive cookies getter
function getCookies(entries: HeaderEntry[]) {
  return entries.filter((entry) => entry.name.toLowerCase() === "set-cookie").map((entry) => entry.value);
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
  const cookies = getCookies(entries);
  const hstsMaxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? "0");
  const cookieFlagsOk = cookies.length === 0 || cookies.every((cookie) =>
    /;\s*secure/i.test(cookie) && /;\s*httponly/i.test(cookie) && /;\s*samesite=(lax|strict|none)/i.test(cookie)
  );

  return [
    {
      name: "Content-Security-Policy (CSP)",
      severity: "high",
      passed: Boolean(csp) && /default-src/i.test(csp) && !/unsafe-inline|unsafe-eval/i.test(csp),
      detail: csp || "缺少",
      action: "设置 default-src，禁用 object-src，并尽量避免使用 unsafe-inline。"
    },
    {
      name: "Strict-Transport-Security (HSTS)",
      severity: "high",
      passed: hstsMaxAge >= 15552000,
      detail: hsts || "缺少",
      action: "设置 max-age 至少为 15552000 秒（约 180 天），推荐配置 includeSubDomains。"
    },
    {
      name: "X-Content-Type-Options",
      severity: "medium",
      passed: xcto.toLowerCase() === "nosniff",
      detail: xcto || "缺少",
      action: "设置 X-Content-Type-Options: nosniff，防止浏览器执行非预期 MIME 类型文件。"
    },
    {
      name: "点击劫持防御 (Clickjacking Protection)",
      severity: "medium",
      passed: /frame-ancestors/i.test(csp) || /^(DENY|SAMEORIGIN)$/i.test(xfo),
      detail: xfo || (csp ? "CSP 中已包含 frame-ancestors" : "缺少"),
      action: "配置 X-Frame-Options: DENY/SAMEORIGIN，或在 CSP 中设置 frame-ancestors 指令。"
    },
    {
      name: "Referrer-Policy",
      severity: "low",
      passed: /^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/i.test(referrer),
      detail: referrer || "缺少",
      action: "推荐配置 strict-origin-when-cross-origin 以平衡隐私与业务统计。"
    },
    {
      name: "Permissions-Policy",
      severity: "low",
      passed: Boolean(permissions) && !/\*=/.test(permissions),
      detail: permissions || "缺少",
      action: "显式禁用页面中不需要调用的客户端传感器或设备（例如 camera=(), microphone=()）。"
    },
    {
      name: "Cross-Origin-Opener-Policy (COOP)",
      severity: "low",
      passed: /^same-origin/i.test(coop),
      detail: coop || "缺少",
      action: "推荐设置 same-origin 以隔离外部跨域窗口，保障环境安全。"
    },
    {
      name: "Cross-Origin-Resource-Policy (CORP)",
      severity: "low",
      passed: /^(same-origin|same-site|cross-origin)$/i.test(corp),
      detail: corp || "缺少",
      action: "设置 corp 指令防范跨域资源窃取。"
    },
    {
      name: "Set-Cookie Flags 校验",
      severity: "high",
      passed: cookieFlagsOk,
      detail: cookies.length ? cookies.join(" / ") : "未检测到 Set-Cookie",
      action: "对于所有会话 Cookie，必须标记 HttpOnly、Secure 和 SameSite 属性。"
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

export default function HttpSecurityHeadersCheckerTool({ manifest }: ToolAppProps) {
  // Tabs: fetch (online url check) / paste (paste headers)
  const [activeTab, setActiveTab] = useState<"fetch" | "paste">("fetch");
  const [domainUrl, setDomainUrl] = useState("https://google.com");
  const [input, setInput] = useState(sampleHeaders);
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const entries = useMemo(() => parseHeaders(input), [input]);
  const checks = useMemo(() => checkHeaders(entries), [entries]);
  const score = scoreChecks(checks);
  const failed = checks.filter((check) => !check.passed);

  // Fetch headers online using `/api/http-proxy`
  const handleFetchHeaders = async () => {
    if (!domainUrl.trim()) {
      setError("请输入目标 URL 或者是域名");
      return;
    }

    let targetUrl = domainUrl.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/http-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          method: "GET"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `接口请求失败，代码: ${response.status}`);
      }

      // Convert header object back to text block
      const headerLines = [];
      headerLines.push(`HTTP/1.1 ${data.status} ${data.statusText}`);
      Object.entries(data.headers).forEach(([k, v]) => {
        headerLines.push(`${k}: ${v}`);
      });

      setInput(headerLines.join("\n"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取站点响应头失败，请确认该站点是否可正常访问");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">HTTP 安全加固</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "检测网页响应头（Headers）的安全防护等级，给出详细的安全评分和缺失头的加固配置方案。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "fetch" ? "active" : ""} onClick={() => { setActiveTab("fetch"); setError(""); }}>
          在线诊断站点 (输入网址)
        </button>
        <button type="button" className={activeTab === "paste" ? "active" : ""} onClick={() => { setActiveTab("paste"); setError(""); }}>
          手动贴入分析 (粘贴响应头)
        </button>
      </div>

      {activeTab === "fetch" ? (
        <div className="tool-toolbar tool-toolbar--grid" style={{ marginBottom: "1.25rem" }}>
          <label className="tool-field" style={{ flex: 1 }}>
            <span>目标站点 URL</span>
            <input 
              value={domainUrl} 
              onChange={(e) => setDomainUrl(e.target.value)} 
              placeholder="https://example.com"
              style={{ height: "36px" }}
            />
          </label>
          <button 
            type="button" 
            className="button--primary" 
            onClick={handleFetchHeaders} 
            disabled={busy}
            style={{ height: "36px", alignSelf: "end", padding: "0 1.5rem" }}
          >
            {busy ? "检测中..." : "在线检测"}
          </button>
        </div>
      ) : (
        <div className="tool-toolbar" style={{ marginBottom: "1.25rem" }}>
          <button type="button" onClick={() => { setInput(sampleHeaders); setError(""); }}>
            载入默认示例数据
          </button>
        </div>
      )}

      <div className="workspace workspace--two-column">
        {/* Left Column: Headers details */}
        <label className="tool-field" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <span>原始响应头清单 (Headers)</span>
          <textarea 
            value={input} 
            onChange={(event) => setInput(event.target.value)} 
            spellCheck={false} 
            style={{ flex: 1, minHeight: "360px", fontFamily: "var(--font-mono), monospace", fontSize: "0.85rem" }}
          />
        </label>

        {/* Right Column: Audit checks table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem" }}>
            <article className="detail-card">
              <h3>安全评分</h3>
              <p style={{ 
                fontSize: "1.4rem", 
                fontWeight: "bold",
                color: score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444" 
              }}>
                {score} / 100
              </p>
            </article>
            <article className="detail-card">
              <h3>诊断项数</h3>
              <p className="mono-output" style={{ fontSize: "1.1rem" }}>{checks.length}</p>
            </article>
            <article className="detail-card">
              <h3>待处理</h3>
              <p className="mono-output" style={{ fontSize: "1.1rem", color: failed.length > 0 ? "#ef4444" : "var(--text-secondary)" }}>
                {failed.length} 项
              </p>
            </article>
          </div>

          <div className="tool-table" style={{ maxHeight: "290px", overflowY: "auto", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}>
            <div className="tool-table__row tool-table__row--head">
              <span>安全指标</span>
              <span>诊断结论与说明</span>
            </div>
            {checks.map((check) => (
              <div key={check.name} className="tool-table__row" style={{ padding: "0.75rem 0.5rem" }}>
                <span>
                  <strong style={{ fontSize: "0.825rem", color: "var(--text-primary)" }}>{check.name}</strong><br />
                  <span className="pill" style={{ 
                    fontSize: "0.65rem", 
                    padding: "0 0.35rem",
                    background: check.severity === "high" ? "rgba(239, 68, 68, 0.12)" : check.severity === "medium" ? "rgba(234, 179, 8, 0.12)" : "rgba(59, 130, 246, 0.12)",
                    color: check.severity === "high" ? "#ef4444" : check.severity === "medium" ? "#eab308" : "#3b82f6"
                  }}>
                    风险: {severityLabel(check.severity)}
                  </span>
                </span>
                <span style={{ fontSize: "0.8rem", lineHeight: "1.4" }}>
                  <span 
                    className="net-status-badge"
                    style={{ 
                      backgroundColor: check.passed ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      color: check.passed ? "#22c55e" : "#ef4444",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "3px",
                      marginRight: "0.5rem"
                    }}
                  >
                    {check.passed ? "通过" : "缺失/需整改"}
                  </span>
                  {check.passed ? (
                    <span style={{ color: "var(--text-secondary)" }}>当前配置符合安全推荐。</span>
                  ) : (
                    <span style={{ color: "#ef4444" }}>{check.action}</span>
                  )}
                  {check.detail && check.detail !== "缺失" && (
                    <div className="mono-output" style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.25rem", background: "rgba(255,255,255,0.02)", padding: "0.2rem", borderRadius: "3px", wordBreak: "break-all" }}>
                      配置值: {check.detail}
                    </div>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "1rem" }}>
        安全评分参照常见 Web 应用加固指南评判，建议生产环境服务器结合实际业务部署（如内容防篡改、防劫持嵌入等）选择性调整对应安全头配置。
      </p>
    </section>
  );
}
