"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface GeoIPResult {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

interface QueryRecord {
  ip: string;
  result: GeoIPResult | null;
  error: string;
  time: string;
}

export default function IpGeolocationTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookup() {
    const ips = query.trim().split(/[\n, ]+/).filter(Boolean);
    if (ips.length === 0) { setError("请输入 IP 地址"); return; }
    setBusy(true); setError("");

    const records: QueryRecord[] = [];
    for (const ip of ips) {
      try {
        const res = await fetch(`https://ip-api.com/json/${encodeURIComponent(ip)}?fields=query,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as`);
        const data = await res.json() as GeoIPResult & { status?: string };
        records.push({
          ip: data.query || ip,
          result: data.status === "success" ? data : null,
          error: data.status === "fail" ? "查询失败" : "",
          time: new Date().toLocaleTimeString(),
        });
      } catch (e) {
        records.push({ ip, result: null, error: e instanceof Error ? e.message : "请求失败", time: new Date().toLocaleTimeString() });
      }
    }

    setResults(prev => [...records, ...prev].slice(0, 50));
    setBusy(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>IP 地址</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="8.8.8.8，多个用逗号或换行分隔" />
        </label>
        <button type="button" className="button--primary" onClick={lookup} disabled={busy}>{busy ? "查询中..." : "查询"}</button>
      </div>
      {results.length > 0 ? results.map((r, i) => (
        <div key={i} className="detail-card" style={{ marginTop: 8 }}>
          <h3>{r.ip} <span className="mono-output" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.time}</span></h3>
          {r.result ? (
            <div className="detail-grid">
              <article><h4>国家</h4><p>{r.result.country} ({r.result.countryCode})</p></article>
              <article><h4>地区/城市</h4><p>{r.result.regionName} / {r.result.city}</p></article>
              <article><h4>坐标</h4><p>{r.result.lat}, {r.result.lon}</p></article>
              <article><h4>时区</h4><p>{r.result.timezone}</p></article>
              <article><h4>ISP</h4><p>{r.result.isp}</p></article>
              <article><h4>组织</h4><p>{r.result.org}</p></article>
              <article><h4>AS</h4><p>{r.result.as}</p></article>
              <article><h4>邮编</h4><p>{r.result.zip || "-"}</p></article>
            </div>
          ) : <p className="tool-error">{r.error}</p>}
        </div>
      )) : <p className="tool-note">输入 IP 地址查询地理位置信息，使用 ip-api.com 免费服务。</p>}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
