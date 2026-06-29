"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface WhoisParsed {
  registrar: string;
  createdDate: string;
  expiryDate: string;
  nameServers: string[];
  status: string[];
}

interface WhoisResult {
  domain: string;
  server: string;
  parsed: WhoisParsed;
  raw: string;
}

function calculateRemainingDays(expiryDateStr: string): { days: number; status: "expired" | "warning" | "valid" | "unknown" } {
  if (!expiryDateStr || expiryDateStr === "未知") {
    return { days: 0, status: "unknown" };
  }
  try {
    const expiry = new Date(expiryDateStr).getTime();
    if (isNaN(expiry)) return { days: 0, status: "unknown" };
    const now = Date.now();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return { days, status: "expired" };
    if (days <= 60) return { days, status: "warning" };
    return { days, status: "valid" };
  } catch {
    return { days: 0, status: "unknown" };
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "未知") return "未知";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function DomainWhoisLookupTool({ manifest }: ToolAppProps) {
  const [domainInput, setDomainInput] = useState("google.com");
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "raw">("summary");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remainingDaysInfo = useMemo(() => {
    if (!result || !result.parsed.expiryDate) return null;
    return calculateRemainingDays(result.parsed.expiryDate);
  }, [result]);

  const handleLookup = async () => {
    if (!domainInput.trim()) {
      setError("请输入目标域名");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domainInput.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `查询失败，状态码: ${response.status}`);
      }

      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "WHOIS 查询失败，可能是主机名不正确或服务器无响应");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tool-panel">
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .whois-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .whois-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .whois-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .whois-grid-2 {
            grid-template-columns: 1fr 1.2fr;
          }
        }
        .whois-banner {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .whois-banner--valid {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }
        .whois-banner--warning {
          background: rgba(234, 179, 8, 0.12);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.25);
        }
        .whois-banner--expired {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .whois-meta-item {
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          border-bottom: 1px solid var(--border-default);
        }
        .whois-meta-item:last-child {
          border-bottom: none;
        }
        .whois-meta-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.15rem;
        }
        .whois-meta-value {
          font-size: 0.875rem;
          color: var(--text-primary);
          word-break: break-all;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">域名工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "查询顶级域名（TLD）注册数据库，获取当前域名所有权、注册商、DNS解析服务器及注册与过期时效清单。"}</p>
      </div>

      <div className="whois-container">
        {/* Domain input */}
        <div className="whois-card">
          <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", marginBottom: 0 }}>
            <label className="tool-field" style={{ flex: 1 }}>
              <span>输入要查询的域名 (Domain)</span>
              <input 
                value={domainInput} 
                onChange={e => setDomainInput(e.target.value)} 
                placeholder="例如: google.com 或 cnnic.cn" 
                style={{ height: "36px" }}
              />
            </label>
            <button 
              type="button" 
              className="button--primary" 
              onClick={handleLookup} 
              disabled={busy}
              style={{ height: "36px", alignSelf: "end", padding: "0 1.5rem" }}
            >
              {busy ? "正在查询..." : "WHOIS 查询"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div className="whois-grid-2">
            {/* Left Column: Expiration Info & Structured Meta */}
            <div className="whois-card">
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>域名生命周期状态</h3>

              {remainingDaysInfo && remainingDaysInfo.status !== "unknown" && (
                <div className={`whois-banner ${
                  remainingDaysInfo.status === "valid" 
                    ? "whois-banner--valid" 
                    : remainingDaysInfo.status === "warning" 
                      ? "whois-banner--warning" 
                      : "whois-banner--expired"
                }`}>
                  {remainingDaysInfo.status === "valid" && (
                    <span>✓ 域名状态正常。尚有 {remainingDaysInfo.days} 天到期。</span>
                  )}
                  {remainingDaysInfo.status === "warning" && (
                    <span>⚠ 域名即将过期！仅剩 {remainingDaysInfo.days} 天，建议尽快续费以防停服。</span>
                  )}
                  {remainingDaysInfo.status === "expired" && (
                    <span>✗ 域名已到期！已过期 {Math.abs(remainingDaysInfo.days)} 天，随时面临被注销释放。</span>
                  )}
                </div>
              )}

              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-muted)", overflow: "hidden" }}>
                <div className="whois-meta-item">
                  <span className="whois-meta-label">已查询域名 (Domain)</span>
                  <span className="whois-meta-value" style={{ fontWeight: "700", color: "var(--accent-primary)" }}>{result.domain}</span>
                </div>
                <div className="whois-meta-item">
                  <span className="whois-meta-label">所属注册商 (Registrar)</span>
                  <span className="whois-meta-value">{result.parsed.registrar}</span>
                </div>
                <div className="whois-meta-item">
                  <span className="whois-meta-label">创建日期 (Created Time)</span>
                  <span className="whois-meta-value">{formatDate(result.parsed.createdDate)}</span>
                </div>
                <div className="whois-meta-item">
                  <span className="whois-meta-label">到期日期 (Expiry Time)</span>
                  <span className="whois-meta-value">{formatDate(result.parsed.expiryDate)}</span>
                </div>
                <div className="whois-meta-item">
                  <span className="whois-meta-label">响应 WHOIS 服务器 (Registry Server)</span>
                  <span className="whois-meta-value mono-output" style={{ fontSize: "0.8rem" }}>{result.server}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Tabbed Summary & Raw Record */}
            <div className="whois-card">
              <div className="segmented-control" style={{ margin: 0, padding: 2, height: "auto" }}>
                <button 
                  type="button" 
                  className={activeTab === "summary" ? "active" : ""} 
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => setActiveTab("summary")}
                >
                  DNS 与状态信息
                </button>
                <button 
                  type="button" 
                  className={activeTab === "raw" ? "active" : ""} 
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => setActiveTab("raw")}
                >
                  完整 WHOIS 原始日志
                </button>
              </div>

              {activeTab === "summary" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-muted)", overflow: "hidden" }}>
                    <div className="whois-meta-item">
                      <span className="whois-meta-label">权威 DNS 解析服务器 (Name Servers)</span>
                      <span className="whois-meta-value mono-output" style={{ fontSize: "0.8rem", whiteSpace: "pre-line", lineHeight: 1.4 }}>
                        {result.parsed.nameServers.join("\n")}
                      </span>
                    </div>
                    <div className="whois-meta-item">
                      <span className="whois-meta-label">域名状态标志 (Domain Status)</span>
                      <span className="whois-meta-value mono-output" style={{ fontSize: "0.78rem", whiteSpace: "pre-line", lineHeight: 1.4, color: "var(--text-secondary)" }}>
                        {result.parsed.status.join("\n")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <textarea 
                  value={result.raw} 
                  readOnly 
                  spellCheck={false}
                  style={{ 
                    minHeight: "260px", 
                    fontFamily: "var(--font-mono), monospace", 
                    fontSize: "0.8rem",
                    backgroundColor: "var(--bg-muted)",
                    lineHeight: 1.45
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="whois-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            提示：通过向国际顶级域名根机构（IANA）和各后缀注册局中心建立 raw TCP socket 连接，拉取最新的权威数据库记录，以获得无缓存、无延迟的最新域名持有信息。
          </div>
        )}
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
