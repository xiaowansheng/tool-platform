"use client";

import { useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface GeoResult {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
}

interface QueryRecord {
  ip: string;
  result: GeoResult | null;
  error: string;
  time: string;
}

export default function IpGeolocationTool({ manifest }: ToolAppProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Automatically detect client IP on mount
  useEffect(() => {
    detectMyIp(true); // silent detect on load
  }, []);

  // Detect and lookup client's own IP
  async function detectMyIp(silent = false) {
    if (!silent) setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ipgeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // Empty body triggers client IP detection
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `检测 IP 失败，状态码: ${res.status}`);
      }

      const newRecord: QueryRecord = {
        ip: `${data.ip} (本机公网 IP)`,
        result: data,
        error: "",
        time: new Date().toLocaleTimeString()
      };

      setResults(prev => {
        // Prevent duplicate self-ip entries
        const filtered = prev.filter(r => !r.ip.includes("本机公网 IP"));
        return [newRecord, ...filtered].slice(0, 50);
      });
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "获取本机 IP 失败");
      }
    } finally {
      if (!silent) setBusy(false);
    }
  }

  // Lookup custom IPs
  async function lookup() {
    const ips = query.trim().split(/[\n, ]+/).filter(Boolean);
    if (ips.length === 0) {
      setError("请输入 IP 地址");
      return;
    }
    
    setBusy(true);
    setError("");

    const records: QueryRecord[] = [];
    for (const ip of ips) {
      try {
        const res = await fetch("/api/ipgeo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip })
        });
        
        const data = await res.json();
        if (!res.ok) {
          records.push({
            ip,
            result: null,
            error: data.error || `查询失败，状态码: ${res.status}`,
            time: new Date().toLocaleTimeString()
          });
        } else {
          records.push({
            ip,
            result: data,
            error: "",
            time: new Date().toLocaleTimeString()
          });
        }
      } catch (e) {
        records.push({
          ip,
          result: null,
          error: e instanceof Error ? e.message : "请求超时或连接失败",
          time: new Date().toLocaleTimeString()
        });
      }
    }

    setResults(prev => [...records, ...prev].slice(0, 50));
    setBusy(false);
  }

  return (
    <section className="tool-panel">
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .geo-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
        }
        .geo-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .geo-result-block {
          border: 1px solid var(--border-default);
          background: var(--bg-subtle);
          border-radius: var(--radius-lg);
          padding: 1rem;
          margin-top: 0.75rem;
        }
        .geo-ip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-default);
          padding-bottom: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .geo-badge {
          font-family: var(--font-mono), monospace;
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
          padding: 0.1rem 0.4rem;
          font-size: 0.72rem;
          border-radius: 4px;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络基础分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "查询 IP 地址的地理位置、运营商网络（ISP）以及经纬度坐标，支持一键探测本机出口公网 IP。"}</p>
      </div>

      <div className="geo-container">
        {/* Lookup Config Card */}
        <div className="geo-card">
          <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", marginBottom: 0 }}>
            <label className="tool-field" style={{ flex: 1 }}>
              <span>输入查询 IP 地址 (支持多个，使用逗号或空格隔开)</span>
              <input 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                placeholder="例如: 8.8.8.8, 114.114.114.114" 
                style={{ height: "36px" }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignSelf: "end" }}>
              <button 
                type="button" 
                className="button--primary" 
                onClick={lookup} 
                disabled={busy}
                style={{ height: "36px", padding: "0 1.25rem" }}
              >
                {busy ? "查询中..." : "查询"}
              </button>
              <button 
                type="button" 
                onClick={() => detectMyIp(false)} 
                disabled={busy}
                style={{ height: "36px", padding: "0 1.25rem" }}
              >
                探测我的 IP
              </button>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {results.length > 0 ? (
            results.map((r, i) => (
              <div key={i} className="geo-result-block">
                <div className="geo-ip-header">
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    IP: <code style={{ color: "var(--accent-primary)" }}>{r.ip}</code>
                  </h3>
                  <span className="geo-badge">{r.time}</span>
                </div>

                {r.result ? (
                  <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                    <article className="detail-card">
                      <h3>国家 / 地区</h3>
                      <p>{r.result.country} ({r.result.countryCode})</p>
                    </article>
                    <article className="detail-card">
                      <h3>省份 / 城市</h3>
                      <p>{r.result.region || "-"} / {r.result.city || "-"}</p>
                    </article>
                    <article className="detail-card">
                      <h3>互联网服务商 (ISP)</h3>
                      <p style={{ wordBreak: "break-all", fontSize: "0.85rem" }}>{r.result.isp}</p>
                    </article>
                    <article className="detail-card">
                      <h3>坐标 (Lat, Lon)</h3>
                      <p className="mono-output" style={{ fontSize: "0.85rem" }}>{r.result.lat.toFixed(4)}, {r.result.lon.toFixed(4)}</p>
                    </article>
                    <article className="detail-card">
                      <h3>所属自治系统 (AS)</h3>
                      <p className="mono-output" style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{r.result.as}</p>
                    </article>
                    <article className="detail-card">
                      <h3>所属时区 (Timezone)</h3>
                      <p style={{ fontSize: "0.85rem" }}>{r.result.timezone}</p>
                    </article>
                  </div>
                ) : (
                  <p className="tool-error" style={{ margin: 0 }}>⚠️ {r.error}</p>
                )}
              </div>
            ))
          ) : (
            <div className="geo-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              输入 IP 进行地理定位，或点击“探测我的 IP”了解当前的出口公网网络状况。本地接口经过后端反向代理以避免被拦截。
            </div>
          )}
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
