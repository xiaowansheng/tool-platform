"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface RedirectStep {
  url: string;
  status: number;
  headers: Record<string, string>;
}

interface RequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyTruncated: boolean;
  timing: number;
  redirectChain: RedirectStep[];
}

export default function HttpRequestInspectorTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState("Accept: application/json");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<RequestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!url.trim()) { setError("请输入 URL"); return; }
    setBusy(true); setError(""); setResult(null);
    const start = performance.now();
    try {
      const parsedHeaders: Record<string, string> = {};
      headers.split("\n").forEach(line => {
        const idx = line.indexOf(":");
        if (idx > 0) parsedHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });
      const res = await fetch(url, {
        method,
        headers: parsedHeaders,
        body: method !== "GET" && method !== "HEAD" && body ? body : undefined,
        redirect: "manual",
      });
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const text = await res.text();
      setResult({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: text.slice(0, 50000),
        bodyTruncated: text.length > 50000,
        timing: performance.now() - start,
        redirectChain: [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally { setBusy(false); }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>方法</span>
          <select value={method} onChange={e => setMethod(e.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="tool-field" style={{ flex: 1 }}>
          <span>URL</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <button type="button" className="button--primary" onClick={send} disabled={busy}>{busy ? "请求中..." : "发送"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>请求 Headers</span><textarea className="code-input" value={headers} onChange={e => setHeaders(e.target.value)} rows={6} /></label>
          {method !== "GET" && method !== "HEAD" ? (
            <label className="tool-field"><span>请求 Body</span><textarea className="code-input" value={body} onChange={e => setBody(e.target.value)} rows={6} /></label>
          ) : null}
        </div>
        <div className="workspace workspace--stack">
          {result ? (
            <>
              <div className="detail-grid">
                <article className="detail-card"><h3>状态</h3><p>{result.status} {result.statusText}</p></article>
                <article className="detail-card"><h3>耗时</h3><p>{result.timing.toFixed(0)}ms</p></article>
                <article className="detail-card"><h3>响应体</h3><p>{result.body.length} 字符{result.bodyTruncated ? " (截断)" : ""}</p></article>
              </div>
              <label className="tool-field"><span>响应 Headers</span>
                <div className="code-input" style={{ padding: "0.5rem", fontSize: "0.75rem", maxHeight: 200, overflow: "auto" }}>
                  {Object.entries(result.headers).map(([k, v]) => <div key={k} className="mono-output">{k}: {v}</div>)}
                </div>
              </label>
              <label className="tool-field"><span>响应 Body (前 50000 字符)</span>
                <textarea className="code-input" value={result.body} readOnly rows={8} />
              </label>
            </>
          ) : <p className="tool-note">发送 HTTP 请求并查看完整的响应详情。</p>}
        </div>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
