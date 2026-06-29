"use client";

import { useRef, useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface RedirectHop {
  url: string;
  status: number;
  statusText: string;
  location: string | null;
  headers: Record<string, string>;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "#22c55e"; // Success
  if (status >= 300 && status < 400) return "#3b82f6"; // Redirect
  if (status >= 400 && status < 500) return "#f97316"; // Client Error
  if (status >= 500) return "#ef4444"; // Server Error
  return "var(--text-secondary)";
}

export default function HttpRedirectTrackerTool({ manifest }: ToolAppProps) {
  const [url, setUrl] = useState("https://httpbin.org/redirect/3");
  const [hops, setHops] = useState<RedirectHop[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expandedHopIdx, setExpandedHopIdx] = useState<number | null>(null);

  async function trace() {
    if (!url.trim()) {
      setError("请输入 URL");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("URL 必须以 http:// 或 https:// 开头");
      return;
    }

    setBusy(true);
    setError("");
    setHops([]);
    setExpandedHopIdx(null);

    try {
      // Trace redirects using server-side API proxy to bypass browser opaque-redirect restrictions
      const response = await fetch("/api/http-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: url.trim(),
          method: "GET"
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `服务发起代理失败: 状态码 ${response.status}`);
      }

      const data = await response.json() as {
        redirectChain: RedirectHop[];
      };

      if (!data.redirectChain || data.redirectChain.length === 0) {
        throw new Error("未能追踪到任何重定向记录");
      }

      setHops(data.redirectChain);
    } catch (e) {
      setError(e instanceof Error ? e.message : "追踪重定向失败");
    } finally {
      setBusy(false);
    }
  }

  // Get final landing page properties
  const finalHop = useMemo(() => {
    return hops.length > 0 ? hops[hops.length - 1] : null;
  }, [hops]);

  return (
    <section className="tool-panel">
      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .rt-chain-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }
        .rt-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .rt-hop-card {
          border: 1px solid var(--border-default);
          background: var(--bg-subtle);
          border-radius: var(--radius-lg);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          transition: border-color var(--duration-fast);
        }
        .rt-hop-card:hover {
          border-color: var(--accent-primary);
        }
        .rt-hop-connector {
          align-self: center;
          height: 24px;
          width: 2px;
          border-left: 2px dashed var(--border-default);
          margin: -0.25rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rt-hop-connector::after {
          content: "↓";
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-left: -1px;
        }
        .rt-status-badge {
          font-family: var(--font-mono), monospace;
          font-weight: 700;
          font-size: 0.825rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .rt-headers-drawer {
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          margin-top: 0.5rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.78rem;
          max-height: 200px;
          overflow-y: auto;
          animation: slideDown 0.15s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">重定向分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="rt-chain-container">
        {/* Input area */}
        <div className="rt-card">
          <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", marginBottom: 0 }}>
            <label className="tool-field" style={{ flex: 1 }}>
              <span>输入要追踪的目标 URL (支持 HTTP/HTTPS)</span>
              <input 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                placeholder="https://example.com" 
                style={{ height: "36px" }}
              />
            </label>
            <button 
              type="button" 
              className="button--primary" 
              onClick={trace} 
              disabled={busy}
              style={{ height: "36px", alignSelf: "end", padding: "0 1.5rem" }}
            >
              {busy ? "追踪分析中..." : "追踪路径"}
            </button>
          </div>
        </div>

        {/* Trace metrics dashboard */}
        {hops.length > 0 && finalHop && (
          <div className="detail-grid">
            <article className="detail-card">
              <h3>跳转次数 (Hops)</h3>
              <p>{hops.length - 1}</p>
            </article>
            <article className="detail-card">
              <h3>最终状态码</h3>
              <p style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span 
                  className="rt-status-badge"
                  style={{ 
                    backgroundColor: getStatusColor(finalHop.status) + "22",
                    color: getStatusColor(finalHop.status)
                  }}
                >
                  {finalHop.status}
                </span>
                <span style={{ fontSize: "0.85rem" }}>{finalHop.statusText}</span>
              </p>
            </article>
            <article className="detail-card">
              <h3>落地点 URL</h3>
              <p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                {finalHop.url}
              </p>
            </article>
          </div>
        )}

        {/* Hops List flow */}
        {hops.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            {hops.map((hop, i) => {
              const isRedirect = hop.status >= 300 && hop.status < 400;
              const isExpanded = expandedHopIdx === i;

              return (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  {/* Hop Card */}
                  <div className="rt-hop-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                        {i === 0 ? "起节点" : i === hops.length - 1 ? "终节点 (Landing)" : `跳转 #${i}`}
                      </span>
                      <span 
                        className="rt-status-badge"
                        style={{ 
                          backgroundColor: getStatusColor(hop.status) + "22",
                          color: getStatusColor(hop.status)
                        }}
                      >
                        {hop.status} {hop.statusText}
                      </span>
                    </div>

                    <div className="mono-output" style={{ fontSize: "0.825rem", wordBreak: "break-all", color: "var(--text-primary)" }}>
                      {hop.url}
                    </div>

                    {isRedirect && hop.location && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        ↳ 重定向目标位置 (Location): <code style={{ color: "var(--accent-primary)", wordBreak: "break-all" }}>{hop.location}</code>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", borderTop: "1px solid var(--border-default)", paddingTop: "0.5rem" }}>
                      <button 
                        type="button" 
                        className="button-link" 
                        style={{ fontSize: "0.75rem", padding: 0 }}
                        onClick={() => setExpandedHopIdx(isExpanded ? null : i)}
                      >
                        {isExpanded ? "收起响应头 ▲" : "查看响应头 (Headers) ▼"}
                      </button>
                    </div>

                    {/* Headers Drawer */}
                    {isExpanded && (
                      <div className="rt-headers-drawer">
                        {Object.entries(hop.headers).length === 0 ? (
                          <span style={{ color: "var(--text-secondary)" }}>无响应头</span>
                        ) : (
                          Object.entries(hop.headers).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", gap: "0.5rem", margin: "0.15rem 0" }}>
                              <span style={{ color: "var(--accent-primary)", fontWeight: "500" }}>{k}:</span>
                              <span style={{ wordBreak: "break-all" }}>{v}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flow Connector Arrow */}
                  {i < hops.length - 1 && <div className="rt-hop-connector" />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rt-card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            提示：普通浏览器由于同源安全策略(CORS)，限制了直接读取重定向响应头。本工具通过后台服务器代理发出请求，以便精准追踪重定向链（301 / 302 / 307 / 308 等）的完整跳步及中间 Headers 信息。
          </div>
        )}
      </div>
      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
