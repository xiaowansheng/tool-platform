"use client";

import { useEffect, useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface HeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface RequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timing: number;
}

function shellQuote(value: string) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

// Token-based robust cURL Command Parser
function parseCurlCommand(curlCommand: string) {
  const cleanCmd = curlCommand
    .replace(/\\\n/g, " ") // Remove line continuations
    .replace(/\s+/g, " ")  // Normalize spaces
    .trim();

  const tokens: string[] = [];
  let currentToken = "";
  let insideQuote: string | null = null;
  let isEscaped = false;

  for (let i = 0; i < cleanCmd.length; i++) {
    const char = cleanCmd[i];

    if (isEscaped) {
      currentToken += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (insideQuote) {
      if (char === insideQuote) {
        insideQuote = null;
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"' || char === "'") {
        insideQuote = char;
      } else if (char === " ") {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = "";
        }
      } else {
        currentToken += char;
      }
    }
  }
  if (currentToken) {
    tokens.push(currentToken);
  }

  let method = "";
  let fullUrl = "";
  const headersList: { key: string; value: string }[] = [];
  let body = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      method = (tokens[i + 1] || "GET").toUpperCase();
      i++;
    } else if (token === "-H" || token === "--header") {
      const headerVal = tokens[i + 1] || "";
      const colonIdx = headerVal.indexOf(":");
      if (colonIdx !== -1) {
        headersList.push({
          key: headerVal.slice(0, colonIdx).trim(),
          value: headerVal.slice(colonIdx + 1).trim()
        });
      }
      i++;
    } else if (
      token === "-d" || 
      token === "--data" || 
      token === "--data-raw" || 
      token === "--data-binary" ||
      token === "--data-ascii"
    ) {
      body = tokens[i + 1] || "";
      if (!method) method = "POST"; // Default to POST if body is present
      i++;
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      fullUrl = token;
    } else if (token !== "curl" && !token.startsWith("-")) {
      if (token.includes(".") && !fullUrl) {
        fullUrl = token.startsWith("http") ? token : "http://" + token;
      }
    }
  }

  if (!method) method = "GET";

  // Parse Query Parameters from URL
  let baseUrl = fullUrl;
  const queryParamsList: { key: string; value: string }[] = [];

  try {
    const parsedUrl = new URL(fullUrl);
    baseUrl = parsedUrl.origin + parsedUrl.pathname;
    parsedUrl.searchParams.forEach((v, k) => {
      queryParamsList.push({ key: k, value: v });
    });
  } catch {
    // Ignore URL parse failures
    const questionIdx = fullUrl.indexOf("?");
    if (questionIdx !== -1) {
      baseUrl = fullUrl.slice(0, questionIdx);
      const queryStr = fullUrl.slice(questionIdx + 1);
      queryStr.split("&").forEach(pair => {
        const parts = pair.split("=");
        if (parts[0]) {
          queryParamsList.push({
            key: decodeURIComponent(parts[0]),
            value: decodeURIComponent(parts[1] || "")
          });
        }
      });
    }
  }

  return { method, baseUrl, queryParamsList, headersList, body };
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "#22c55e"; // Success
  if (status >= 300 && status < 400) return "#3b82f6"; // Redirect
  if (status >= 400 && status < 500) return "#f97316"; // Client Error
  if (status >= 500) return "#ef4444"; // Server Error
  return "var(--text-secondary)";
}

export default function CurlBuilderTool({ manifest }: ToolAppProps) {
  // Tabs: builder (construct parameters) / parser (paste cURL command)
  const [activeTab, setActiveTab] = useState<"builder" | "parser">("builder");

  // Core Request States
  const [method, setMethod] = useState("POST");
  const [url, setUrl] = useState("https://httpbin.org/post");
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { id: "h1", key: "Content-Type", value: "application/json", enabled: true },
    { id: "h2", key: "Authorization", value: "Bearer TOKEN", enabled: false }
  ]);
  const [queryParams, setQueryParams] = useState<QueryParamItem[]>([
    { id: "q1", key: "version", value: "1.0", enabled: true }
  ]);
  const [body, setBody] = useState('{\n  "name": "cURL Builder"\n}');
  
  // Raw Paste input state (Parser Mode)
  const [rawCurlInput, setRawCurlInput] = useState(
    'curl -X POST "https://httpbin.org/post?version=1.0" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n  "name": "cURL Builder"\n}\''
  );

  // Response execute states
  const [result, setResult] = useState<RequestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rightTab, setRightTab] = useState<"body" | "headers" | "preview">("body");

  // Generate unique IDs
  const makeId = () => Math.random().toString(36).slice(2, 9);

  // Re-assemble Full URL containing Query Params
  const fullUrl = useMemo(() => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return "";

    const params = new URLSearchParams();
    queryParams.forEach(q => {
      if (q.enabled && q.key) {
        params.append(q.key, q.value);
      }
    });

    const queryStr = params.toString();
    if (queryStr) {
      const separator = cleanUrl.includes("?") ? "&" : "?";
      return cleanUrl + separator + queryStr;
    }
    return cleanUrl;
  }, [url, queryParams]);

  // Re-assemble Output cURL Command Line
  const command = useMemo(() => {
    if (!fullUrl) return "等待输入 URL...";
    
    const activeHeaders = headers.filter(h => h.enabled && h.key);
    const hasBody = body.trim() !== "" && method !== "GET" && method !== "HEAD";
    
    const lines = [
      "curl",
      "-X",
      method,
      shellQuote(fullUrl)
    ];

    activeHeaders.forEach(h => {
      lines.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);
    });

    if (hasBody) {
      lines.push(`-d ${shellQuote(body)}`);
    }

    return lines.join(" \\\n  ");
  }, [method, fullUrl, headers, body]);

  // Execute parse action
  const handleParseCurl = () => {
    if (!rawCurlInput.trim()) {
      setError("请先贴入有效的 cURL 命令");
      return;
    }
    setError("");
    try {
      const parsed = parseCurlCommand(rawCurlInput);
      setMethod(parsed.method);
      setUrl(parsed.baseUrl);
      
      // Map query params
      setQueryParams(
        parsed.queryParamsList.map(q => ({ id: makeId(), key: q.key, value: q.value, enabled: true }))
      );
      // Map headers
      setHeaders(
        parsed.headersList.map(h => ({ id: makeId(), key: h.key, value: h.value, enabled: true }))
      );
      setBody(parsed.body);
      
      // Switch back to builder tab to inspect results
      setActiveTab("builder");
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析 cURL 命令失败，格式不正确");
    }
  };

  // Execute request online using `/api/http-proxy`
  const handleExecuteRequest = async () => {
    if (!fullUrl) {
      setError("请输入目标 URL");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    const start = performance.now();
    const headersMap: Record<string, string> = {};
    headers.forEach(h => {
      if (h.enabled && h.key) {
        headersMap[h.key] = h.value;
      }
    });

    try {
      const response = await fetch("/api/http-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fullUrl,
          method,
          headers: headersMap,
          body: method !== "GET" && method !== "HEAD" ? body : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `请求失败，状态码: ${response.status}`);
      }

      setResult({
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        body: data.body,
        timing: performance.now() - start
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接超时或代理发送失败");
    } finally {
      setBusy(false);
    }
  };

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Visually format response JSON
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
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .curl-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .curl-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .curl-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .curl-grid-2 {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }
        .curl-param-row {
          display: grid;
          grid-template-columns: auto 1.1fr 1.3fr auto;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .curl-param-row input[type="text"] {
          padding: 0.35rem 0.5rem;
          font-size: 0.825rem;
          height: 30px;
        }
        .curl-btn-remove {
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
        .curl-btn-remove:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }
        .curl-status-tag {
          font-family: var(--font-mono), monospace;
          font-weight: bold;
          font-size: 0.85rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">接口调试与转换</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "提供 cURL 命令双向解析与手动拼接功能，可将外部复制的 cURL 拆解为可视化请求头与参数并修改，同时支持代理在线发送测试。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "builder" ? "active" : ""} onClick={() => { setActiveTab("builder"); setError(""); }}>
          可视化工作区 (Builder)
        </button>
        <button type="button" className={activeTab === "parser" ? "active" : ""} onClick={() => { setActiveTab("parser"); setError(""); }}>
          贴入 cURL 命令行进行解析
        </button>
      </div>

      <div className="curl-container">
        {/* PARSER TAB */}
        {activeTab === "parser" && (
          <div className="curl-card">
            <label className="tool-field" style={{ margin: 0 }}>
              <span>在此粘贴 cURL 命令行 (支持多行带有反斜杠的命令)</span>
              <textarea 
                value={rawCurlInput} 
                onChange={e => setRawCurlInput(e.target.value)} 
                placeholder="curl -X GET 'https://example.com/api' -H 'Accept: json'"
                style={{ minHeight: "180px", fontFamily: "var(--font-mono), monospace", fontSize: "0.825rem" }}
              />
            </label>
            <button 
              type="button" 
              className="button--primary" 
              onClick={handleParseCurl}
              style={{ alignSelf: "flex-end", padding: "0 1.5rem" }}
            >
              立即解析命令并回填
            </button>
          </div>
        )}

        {/* BUILDER / WORKSPACE TAB */}
        {activeTab === "builder" && (
          <div className="curl-grid-2">
            {/* Left side: Config inputs */}
            <div className="curl-card">
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>请求参数与配置</h3>
              
              <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", margin: 0 }}>
                <label className="tool-field tool-field--compact" style={{ width: "90px" }}>
                  <span>HTTP 方法</span>
                  <select value={method} onChange={e => setMethod(e.target.value)} style={{ height: "36px" }}>
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                  <span>基本 URL (Base URL)</span>
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/api" style={{ height: "36px" }} />
                </label>
              </div>

              {/* URL Params */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", fontWeight: 500 }}>URL 查询参数 (Query Parameters)</span>
                  <button type="button" className="button-link" style={{ fontSize: "0.78rem" }} onClick={() => setQueryParams([...queryParams, { id: makeId(), key: "", value: "", enabled: true }])}>
                    + 添加参数
                  </button>
                </div>
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {queryParams.map(q => (
                    <div key={q.id} className="curl-param-row">
                      <input type="checkbox" checked={q.enabled} onChange={e => setQueryParams(queryParams.map(item => item.id === q.id ? { ...item, enabled: e.target.checked } : item))} />
                      <input type="text" placeholder="Key" value={q.key} onChange={e => setQueryParams(queryParams.map(item => item.id === q.id ? { ...item, key: e.target.value } : item))} />
                      <input type="text" placeholder="Value" value={q.value} onChange={e => setQueryParams(queryParams.map(item => item.id === q.id ? { ...item, value: e.target.value } : item))} />
                      <button type="button" className="curl-btn-remove" onClick={() => setQueryParams(queryParams.filter(item => item.id !== q.id))}>×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Headers */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", fontWeight: 500 }}>请求头 (Headers)</span>
                  <button type="button" className="button-link" style={{ fontSize: "0.78rem" }} onClick={() => setHeaders([...headers, { id: makeId(), key: "", value: "", enabled: true }])}>
                    + 添加请求头
                  </button>
                </div>
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {headers.map(h => (
                    <div key={h.id} className="curl-param-row">
                      <input type="checkbox" checked={h.enabled} onChange={e => setHeaders(headers.map(item => item.id === h.id ? { ...item, enabled: e.target.checked } : item))} />
                      <input type="text" placeholder="Header Key" value={h.key} onChange={e => setHeaders(headers.map(item => item.id === h.id ? { ...item, key: e.target.value } : item))} />
                      <input type="text" placeholder="Value" value={h.value} onChange={e => setHeaders(headers.map(item => item.id === h.id ? { ...item, value: e.target.value } : item))} />
                      <button type="button" className="curl-btn-remove" onClick={() => setHeaders(headers.filter(item => item.id !== h.id))}>×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Body */}
              {method !== "GET" && method !== "HEAD" && (
                <label className="tool-field" style={{ margin: 0 }}>
                  <span>请求主体 (Body Payload)</span>
                  <textarea 
                    value={body} 
                    onChange={e => setBody(e.target.value)} 
                    spellCheck={false}
                    rows={4}
                    style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.825rem" }}
                  />
                </label>
              )}
            </div>

            {/* Right side: Output cURL & Online Run */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Generated cURL command */}
              <div className="curl-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>生成的 cURL 命令行</h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" className="button--primary" onClick={handleExecuteRequest} disabled={busy} style={{ padding: "0 0.85rem", fontSize: "0.75rem", height: "26px" }}>
                      {busy ? "执行中..." : "在线运行请求"}
                    </button>
                    <button type="button" onClick={copyCommand} style={{ padding: "0 0.85rem", fontSize: "0.75rem", height: "26px" }}>
                      {copied ? "已复制" : "复制命令"}
                    </button>
                  </div>
                </div>

                <textarea 
                  value={command} 
                  readOnly 
                  spellCheck={false}
                  rows={6}
                  style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem", background: "var(--bg-muted)", lineHeight: 1.4 }}
                />
              </div>

              {/* Executed response outputs */}
              <div className="curl-card" style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>在线执行结果 (Response)</h3>

                {result ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
                    <div className="detail-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                      <article className="detail-card">
                        <h3>状态码</h3>
                        <p style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span 
                            className="curl-status-tag"
                            style={{ 
                              backgroundColor: getStatusColor(result.status) + "22",
                              color: getStatusColor(result.status)
                            }}
                          >
                            {result.status}
                          </span>
                        </p>
                      </article>
                      <article className="detail-card">
                        <h3>时耗</h3>
                        <p className="mono-output" style={{ fontSize: "1rem" }}>{result.timing.toFixed(0)} ms</p>
                      </article>
                      <article className="detail-card">
                        <h3>大小</h3>
                        <p className="mono-output" style={{ fontSize: "1rem" }}>{(result.body.length / 1024).toFixed(2)} KB</p>
                      </article>
                    </div>

                    <div className="segmented-control" style={{ margin: 0, padding: 2, height: "auto" }}>
                      <button 
                        type="button" 
                        className={rightTab === "body" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                        onClick={() => setRightTab("body")}
                      >
                        响应主体 Body
                      </button>
                      <button 
                        type="button" 
                        className={rightTab === "headers" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                        onClick={() => setRightTab("headers")}
                      >
                        响应头 Headers
                      </button>
                      <button 
                        type="button" 
                        className={rightTab === "preview" ? "active" : ""} 
                        style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                        onClick={() => setRightTab("preview")}
                      >
                        HTML 预览
                      </button>
                    </div>

                    {rightTab === "body" && (
                      <textarea 
                        value={formattedResponseBody} 
                        readOnly 
                        spellCheck={false}
                        style={{ 
                          minHeight: "150px", 
                          maxHeight: "240px",
                          fontFamily: "var(--font-mono), monospace", 
                          fontSize: "0.8rem",
                          backgroundColor: "var(--bg-muted)",
                          lineHeight: 1.4 
                        }}
                      />
                    )}

                    {rightTab === "headers" && (
                      <div style={{ 
                        maxHeight: "180px", 
                        overflowY: "auto", 
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-muted)",
                        padding: "0.5rem"
                      }}>
                        {Object.entries(result.headers).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", gap: "0.5rem", padding: "0.25rem 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.78rem" }}>
                            <span className="mono-output" style={{ color: "var(--accent-primary)", fontWeight: "500" }}>{k}:</span>
                            <span className="mono-output" style={{ wordBreak: "break-all" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {rightTab === "preview" && (
                      <div>
                        {result.body.toLowerCase().includes("<html") || result.body.toLowerCase().includes("<!doctype") ? (
                          <iframe 
                            srcDoc={result.body} 
                            sandbox="allow-scripts" 
                            style={{ 
                              width: "100%", 
                              height: "180px", 
                              border: "1px solid var(--border-default)", 
                              borderRadius: "var(--radius-md)", 
                              background: "#ffffff" 
                            }}
                          />
                        ) : (
                          <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                            未检测到 HTML 文档结构，无法生成渲染预览。
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
                    minHeight: "160px",
                    border: "2px dashed var(--border-default)", 
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem"
                  }}>
                    无响应数据，可点击上方“在线运行请求”测试发送连接。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：通过词法词法分析器支持自动忽略斜杠折行、自动解包单双引号、剥离 URL 查询参数至网格中编辑；在线测试发送经过后端代理，可完美绕过 CORS 拦截。
      </p>
    </section>
  );
}
