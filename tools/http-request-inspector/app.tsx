"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface RedirectStep {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  location: string | null;
}

interface RequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timing: number;
  redirectChain: RedirectStep[];
}

interface HeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HistoryItem {
  id: string;
  url: string;
  method: string;
  timestamp: string;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "#22c55e"; // Success
  if (status >= 300 && status < 400) return "#3b82f6"; // Redirect
  if (status >= 400 && status < 500) return "#f97316"; // Client Error
  if (status >= 500) return "#ef4444"; // Server Error
  return "var(--text-secondary)";
}

export default function HttpRequestInspectorTool({ manifest }: ToolAppProps) {
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [method, setMethod] = useState("GET");
  
  // Structured Request Headers
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { id: "h1", key: "Accept", value: "application/json", enabled: true },
    { id: "h2", key: "User-Agent", value: "Mozilla/5.0 (ToolPlatform)", enabled: false }
  ]);
  
  const [body, setBody] = useState("");
  const [useProxy, setUseProxy] = useState(true); // Bypass CORS by default
  const [result, setResult] = useState<RequestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  const [leftTab, setLeftTab] = useState<"params" | "body">("params");
  const [rightTab, setRightTab] = useState<"body" | "headers" | "redirect" | "preview">("body");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load request history
  useEffect(() => {
    try {
      const saved = localStorage.getItem("http_inspector_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveToHistory = (targetUrl: string, targetMethod: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).slice(2, 9),
      url: targetUrl,
      method: targetMethod,
      timestamp: new Date().toLocaleTimeString()
    };
    const updated = [newItem, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("http_inspector_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("http_inspector_history");
  };

  const addHeader = () => {
    setHeaders([...headers, { id: Math.random().toString(36).slice(2, 9), key: "", value: "", enabled: true }]);
  };

  const updateHeader = (id: string, field: "key" | "value" | "enabled", val: unknown) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter(h => h.id !== id));
  };

  const parsedHeaders = useMemo(() => {
    const obj: Record<string, string> = {};
    headers.forEach(h => {
      if (h.enabled && h.key) {
        obj[h.key] = h.value;
      }
    });
    return obj;
  }, [headers]);

  async function send() {
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
    setResult(null);
    const start = performance.now();

    try {
      if (useProxy) {
        // Send request via server-side HTTP proxy to bypass CORS
        const response = await fetch("/api/http-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: url.trim(),
            method,
            headers: parsedHeaders,
            body: method !== "GET" && method !== "HEAD" ? body : undefined
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `请求代理失败, 状态码: ${response.status}`);
        }

        const data = await response.json() as {
          status: number;
          statusText: string;
          headers: Record<string, string>;
          body: string;
          redirectChain: RedirectStep[];
        };

        setResult({
          status: data.status,
          statusText: data.statusText,
          headers: data.headers,
          body: data.body,
          timing: performance.now() - start,
          redirectChain: data.redirectChain
        });
      } else {
        // Direct browser fetch
        const res = await fetch(url.trim(), {
          method,
          headers: parsedHeaders,
          body: method !== "GET" && method !== "HEAD" && body ? body : undefined,
          redirect: "manual"
        });

        const resHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          resHeaders[k] = v;
        });

        const text = await res.text();
        
        // Browsers return status 0 and opaque responses for manual redirection cross-origin
        const isOpaqueRedirect = res.type === "opaqueredirect" || res.status === 0;

        setResult({
          status: isOpaqueRedirect ? 302 : res.status,
          statusText: isOpaqueRedirect ? "Found (Opaque Redirect)" : res.statusText,
          headers: resHeaders,
          body: isOpaqueRedirect ? "由于浏览器同源安全策略(CORS)，重定向内容不可读。建议勾选“使用服务器代理绕过 CORS”。" : text,
          timing: performance.now() - start,
          redirectChain: []
        });
      }

      saveToHistory(url.trim(), method);
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  // Auto format response body if it's JSON
  const formattedResponseBody = useMemo(() => {
    if (!result || !result.body) return "";
    try {
      const parsed = JSON.parse(result.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return result.body;
    }
  }, [result]);

  return (
    <section className="tool-panel">
      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .http-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .http-settings-card, .http-editor-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .http-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .http-grid-2 {
            grid-template-columns: 1fr 1.2fr;
          }
        }
        .http-param-row {
          display: grid;
          grid-template-columns: auto 1fr 1.2fr auto;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .http-param-row input[type="text"] {
          padding: 0.35rem 0.5rem;
          font-size: 0.85rem;
          height: 30px;
        }
        .http-btn-remove {
          background: transparent;
          border: 1px solid var(--border-default);
          color: #ef4444;
          cursor: pointer;
          height: 30px;
          width: 30px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--duration-fast);
        }
        .http-btn-remove:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }
        .http-redirect-step {
          padding: 0.75rem;
          border: 1px solid var(--border-default);
          background: var(--bg-muted);
          border-radius: var(--radius-md);
          margin-bottom: 0.5rem;
          font-size: 0.825rem;
        }
        .http-status-tag {
          font-family: var(--font-mono), monospace;
          font-weight: bold;
          font-size: 0.85rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .http-history-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .http-history-item {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--duration-fast);
        }
        .http-history-item:hover {
          border-color: var(--accent-primary);
          background: var(--bg-subtle);
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">接口网络工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="http-container">
        {/* URL and Method inputs card */}
        <div className="http-settings-card">
          <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", marginBottom: 0 }}>
            <label className="tool-field tool-field--compact" style={{ width: "90px" }}>
              <span>请求方法</span>
              <select value={method} onChange={e => setMethod(e.target.value)} style={{ height: "36px" }}>
                {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
              <span>目标 URL</span>
              <input 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                placeholder="https://example.com/api" 
                style={{ height: "36px" }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignSelf: "end" }}>
              <button 
                type="button" 
                className="button--primary" 
                onClick={send} 
                disabled={busy} 
                style={{ height: "36px", padding: "0 1.25rem" }}
              >
                {busy ? "请求中..." : "发送请求"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={useProxy} 
                onChange={e => setUseProxy(e.target.checked)} 
              />
              <span>使用服务器代理发送 (推荐：可绕过浏览器 CORS 跨域限制，且支持追踪重定向链)</span>
            </label>
          </div>

          {/* Request History */}
          {history.length > 0 && (
            <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border-default)", paddingTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>历史快速重新载入：</span>
                <button type="button" className="button-link" style={{ fontSize: "0.72rem" }} onClick={clearHistory}>清除历史</button>
              </div>
              <div className="http-history-list">
                {history.map(h => (
                  <span 
                    key={h.id} 
                    className="http-history-item"
                    onClick={() => {
                      setUrl(h.url);
                      setMethod(h.method);
                    }}
                    title={`${h.url} (${h.timestamp})`}
                  >
                    <strong>{h.method}</strong> {h.url.length > 35 ? h.url.substring(0, 35) + "..." : h.url}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workspace Panels */}
        <div className="http-grid-2">
          {/* Left panel: Headers and Body editor */}
          <div className="http-editor-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="segmented-control" style={{ margin: 0 }}>
              <button 
                type="button" 
                className={leftTab === "params" ? "active" : ""} 
                onClick={() => setLeftTab("params")}
              >
                请求头 Headers ({headers.filter(h => h.enabled && h.key).length})
              </button>
              <button 
                type="button" 
                className={leftTab === "body" ? "active" : ""} 
                onClick={() => setLeftTab("body")}
                disabled={method === "GET" || method === "HEAD"}
              >
                请求体 Body
              </button>
            </div>

            {leftTab === "params" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>设置自定义请求头 Headers:</span>
                  <button type="button" className="button-link" style={{ fontSize: "0.8rem" }} onClick={addHeader}>+ 添加请求头</button>
                </div>
                
                <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {headers.map(h => (
                    <div key={h.id} className="http-param-row">
                      <input 
                        type="checkbox" 
                        checked={h.enabled} 
                        onChange={e => updateHeader(h.id, "enabled", e.target.checked)}
                      />
                      <input 
                        type="text" 
                        placeholder="键 Key" 
                        value={h.key} 
                        onChange={e => updateHeader(h.id, "key", e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="值 Value" 
                        value={h.value} 
                        onChange={e => updateHeader(h.id, "value", e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="http-btn-remove" 
                        onClick={() => removeHeader(h.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <label className="tool-field" style={{ flex: 1, margin: 0 }}>
                <span>请求主体 Payload (RAW)</span>
                <textarea 
                  value={body} 
                  onChange={e => setBody(e.target.value)} 
                  spellCheck={false}
                  placeholder='例如 JSON: { "key": "value" } 或纯文本'
                  style={{ minHeight: "260px", fontFamily: "var(--font-mono), monospace", fontSize: "0.85rem" }}
                />
              </label>
            )}
          </div>

          {/* Right panel: Response details display */}
          <div className="http-editor-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="jwt-editor-header">
              <span>响应详情 (Response)</span>
            </div>

            {result ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
                {/* Stats indicators */}
                <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem" }}>
                  <article className="detail-card">
                    <h3>状态码</h3>
                    <p style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span 
                        className="http-status-tag" 
                        style={{ 
                          backgroundColor: getStatusColor(result.status) + "22",
                          color: getStatusColor(result.status)
                        }}
                      >
                        {result.status}
                      </span>
                      <span style={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {result.statusText}
                      </span>
                    </p>
                  </article>
                  <article className="detail-card">
                    <h3>耗时</h3>
                    <p className="mono-output" style={{ fontSize: "1.05rem" }}>{result.timing.toFixed(0)} ms</p>
                  </article>
                  <article className="detail-card">
                    <h3>内容大小</h3>
                    <p className="mono-output" style={{ fontSize: "1.05rem" }}>
                      {result.body ? `${(result.body.length / 1024).toFixed(2)} KB` : "0 KB"}
                    </p>
                  </article>
                </div>

                {/* Response Tabs */}
                <div className="segmented-control" style={{ margin: 0, padding: 2, height: "auto" }}>
                  <button 
                    type="button" 
                    className={rightTab === "body" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                    onClick={() => setRightTab("body")}
                  >
                    响应体 Body
                  </button>
                  <button 
                    type="button" 
                    className={rightTab === "headers" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                    onClick={() => setRightTab("headers")}
                  >
                    响应头 Headers ({Object.keys(result.headers).length})
                  </button>
                  <button 
                    type="button" 
                    className={rightTab === "redirect" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                    onClick={() => setRightTab("redirect")}
                  >
                    重定向链 ({result.redirectChain.length})
                  </button>
                  <button 
                    type="button" 
                    className={rightTab === "preview" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                    onClick={() => setRightTab("preview")}
                  >
                    网页预览 (HTML)
                  </button>
                </div>

                {/* Tab Content: Response Body */}
                {rightTab === "body" && (
                  <textarea 
                    value={formattedResponseBody} 
                    readOnly 
                    spellCheck={false}
                    style={{ 
                      minHeight: "240px", 
                      maxHeight: "360px",
                      fontFamily: "var(--font-mono), monospace", 
                      fontSize: "0.825rem",
                      backgroundColor: "var(--bg-muted)",
                      lineHeight: 1.4
                    }}
                  />
                )}

                {/* Tab Content: Response Headers */}
                {rightTab === "headers" && (
                  <div style={{ 
                    maxHeight: "260px", 
                    overflowY: "auto", 
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-muted)",
                    padding: "0.5rem"
                  }}>
                    {Object.entries(result.headers).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: "0.5rem", padding: "0.25rem 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.8rem" }}>
                        <span className="mono-output" style={{ color: "var(--accent-primary)", fontWeight: "500" }}>{k}:</span>
                        <span className="mono-output" style={{ wordBreak: "break-all" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab Content: Redirect Chain */}
                {rightTab === "redirect" && (
                  <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {result.redirectChain.length === 0 ? (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                        {useProxy ? "未检测到重定向跳转事件。" : "直连模式下不提供重定向路径记录，请开启服务器代理模式以追踪重定向链。"}
                      </p>
                    ) : (
                      result.redirectChain.map((hop, idx) => (
                        <div key={idx} className="http-redirect-step">
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                            <strong>跳数 #{idx + 1}</strong>
                            <span 
                              className="http-status-tag"
                              style={{ 
                                backgroundColor: getStatusColor(hop.status) + "22",
                                color: getStatusColor(hop.status),
                                fontSize: "0.75rem"
                              }}
                            >
                              {hop.status} {hop.statusText}
                            </span>
                          </div>
                          <div className="mono-output" style={{ color: "var(--text-primary)", wordBreak: "break-all", fontSize: "0.78rem" }}>
                            {hop.url}
                          </div>
                          {hop.location && (
                            <div style={{ color: "var(--text-secondary)", marginTop: "0.25rem", fontSize: "0.75rem" }}>
                              ↳ 重定向至: <code style={{ color: "var(--accent-primary)" }}>{hop.location}</code>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab Content: Preview */}
                {rightTab === "preview" && (
                  <div>
                    {result.body.toLowerCase().includes("<html") || result.body.toLowerCase().includes("<!doctype") ? (
                      <iframe 
                        srcDoc={result.body} 
                        sandbox="allow-scripts" 
                        style={{ 
                          width: "100%", 
                          height: "260px", 
                          border: "1px solid var(--border-default)", 
                          borderRadius: "var(--radius-md)", 
                          background: "#ffffff" 
                        }}
                      />
                    ) : (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                        响应体内容不包含 HTML，无法渲染预览。
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                minHeight: "260px",
                border: "2px dashed var(--border-default)", 
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontSize: "0.875rem"
              }}>
                请设置并发送 HTTP 请求，响应详情将展示在此处。
              </div>
            )}
          </div>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
