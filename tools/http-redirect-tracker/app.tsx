"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface RedirectHop {
  url: string;
  status: number;
  statusText: string;
  location: string | null;
  headers: [string, string][];
}

export default function HttpRedirectTrackerTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [url, setUrl] = useState("https://httpbin.org/redirect/5");
  const [hops, setHops] = useState<RedirectHop[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function trace() {
    if (!url.trim()) { setError("请输入 URL"); return; }
    setBusy(true); setError(""); setHops([]);
    const chain: RedirectHop[] = [];
    let currentUrl = url;
    try {
      while (chain.length < 20) {
        const res = await fetch(currentUrl, { redirect: "manual", signal: AbortSignal.timeout(10000) });
        const location = res.headers.get("location");
        const headers: [string, string][] = [];
        res.headers.forEach((v, k) => { headers.push([k, v]); });
        chain.push({ url: currentUrl, status: res.status, statusText: res.statusText, location, headers });
        if (!location || res.status < 300 || res.status >= 400) break;
        try { currentUrl = new URL(location, currentUrl).href; } catch { break; }
      }
      setHops(chain);
    } catch (e) {
      setError(e instanceof Error ? e.message : "追踪失败");
    } finally { setBusy(false); }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field" style={{ flex: 1 }}>
          <span>URL</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <button type="button" className="button--primary" onClick={trace} disabled={busy}>{busy ? "追踪中..." : "追踪"}</button>
      </div>
      {hops.length > 0 ? (
        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card"><h3>跳转次数</h3><p>{hops.length}</p></article>
            <article className="detail-card"><h3>最终状态</h3><p>{hops[hops.length - 1].status}</p></article>
            <article className="detail-card"><h3>最终 URL</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{hops[hops.length - 1].url}</p></article>
          </div>
          {hops.map((hop, i) => (
            <div key={i} className="detail-card">
              <h3>#{i + 1} {hop.status} {hop.statusText}</h3>
              <p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{hop.url}</p>
              {hop.location ? <p className="tool-note">Location: {hop.location}</p> : null}
            </div>
          ))}
        </div>
      ) : <p className="tool-note">输入 URL 追踪 HTTP 重定向链，最多追踪 20 跳。</p>}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
