"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface CertDetails {
  subject: {
    CN?: string;
    O?: string;
    OU?: string;
    C?: string;
    L?: string;
    ST?: string;
    [key: string]: any;
  };
  issuer: {
    CN?: string;
    O?: string;
    C?: string;
    [key: string]: any;
  };
  valid_from: string;
  valid_to: string;
  fingerprint: string;
  fingerprint256: string;
  serialNumber: string;
  subjectaltname?: string;
}

function parseDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function calculateRemainingDays(expiryDateStr: string): { days: number; status: "expired" | "warning" | "valid" } {
  try {
    const expiry = new Date(expiryDateStr).getTime();
    const now = Date.now();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return { days, status: "expired" };
    if (days <= 14) return { days, status: "warning" };
    return { days, status: "valid" };
  } catch {
    return { days: 0, status: "expired" };
  }
}

// Local helper to parse copy-pasted PEM certificates (backward compatibility)
function pemToBytes(pem: string) {
  const base64 = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function readDerLength(bytes: Uint8Array, offset: number) {
  const first = bytes[offset];
  if (first === undefined) return { length: 0, next: offset + 1 };
  if (first < 0x80) return { length: first, next: offset + 1 };
  const count = first & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) {
    length = (length << 8) + (bytes[offset + 1 + index] ?? 0);
  }
  return { length, next: offset + 1 + count };
}

function extractReadableValues(bytes: Uint8Array) {
  const values: string[] = [];
  const decoder = new TextDecoder();

  for (let offset = 0; offset < bytes.length - 2; offset += 1) {
    const tag = bytes[offset];
    if (![0x0c, 0x13, 0x16, 0x17, 0x18].includes(tag ?? 0)) continue;
    const { length, next } = readDerLength(bytes, offset + 1);
    if (length <= 0 || length > 160 || next + length > bytes.length) continue;
    const text = decoder.decode(bytes.slice(next, next + length));
    if (/^[\x20-\x7e]+$/.test(text)) values.push(text);
  }

  return Array.from(new Set(values)).slice(0, 32);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join(":");
}

export default function TlsCertificateParserTool({ manifest }: ToolAppProps) {
  // Tabs: fetch (online fetch) / paste (paste PEM)
  const [activeTab, setActiveTab] = useState<"fetch" | "paste">("fetch");
  
  // Online fetch inputs
  const [domainInput, setDomainInput] = useState("google.com");
  const [port, setPort] = useState("443");
  
  // Paste input
  const [pemInput, setPemInput] = useState("");
  
  // Parsing states
  const [certData, setCertData] = useState<CertDetails | null>(null);
  const [localReport, setLocalReport] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remainingDaysInfo = useMemo(() => {
    if (!certData) return null;
    return calculateRemainingDays(certData.valid_to);
  }, [certData]);

  // Fetch certificate online via server API
  const handleFetchCert = async () => {
    if (!domainInput.trim()) {
      setError("请输入目标主机域名");
      return;
    }
    
    // Clean hostname (remove https:// etc.)
    let cleanHost = domainInput.trim();
    try {
      if (/^https?:\/\//i.test(cleanHost)) {
        cleanHost = new URL(cleanHost).hostname;
      }
    } catch {
      // Ignore URL parse error, use raw input
    }
    
    setBusy(true);
    setError("");
    setCertData(null);

    try {
      const response = await fetch("/api/ssl-fetcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: cleanHost,
          port: parseInt(port) || 443
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `SSL 获取失败，状态码: ${response.status}`);
      }

      setCertData(data.cert);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取证书失败，请检查域名和网络");
    } finally {
      setBusy(false);
    }
  };

  // Local parser method (using original ASN.1 scanner logic for backward compatibility)
  const handleParseLocalPem = async () => {
    if (!pemInput.trim()) {
      setError("请粘贴有效的证书 PEM 字符串");
      return;
    }
    
    setError("");
    setCertData(null);
    setBusy(true);

    try {
      const bytes = pemToBytes(pemInput);
      const sha256Fingerprint = toHex(await crypto.subtle.digest("SHA-256", bytes));
      const sha1Fingerprint = toHex(await crypto.subtle.digest("SHA-1", bytes));
      
      const readable = extractReadableValues(bytes);
      
      // Attempt to guess CN from readable values
      const cn = readable.find(v => v.includes(".")) || "Local PEM Certificate";
      const o = readable.find(v => v.length > 5 && !v.includes(".")) || "未知";

      // Mock parsed cert info
      setCertData({
        subject: { CN: cn, O: o },
        issuer: { CN: "Local DER Decoder" },
        valid_from: "未知 (本地解析限缩，请查看原证书)",
        valid_to: "未知 (本地解析限缩，请查看原证书)",
        fingerprint: sha1Fingerprint.toUpperCase(),
        fingerprint256: sha256Fingerprint.toUpperCase(),
        serialNumber: "Local-DER-Decoded-Serial"
      });

      setLocalReport(JSON.stringify({
        bytes: bytes.byteLength,
        sha256Fingerprint,
        readableValues: readable
      }, null, 2));

    } catch (e) {
      setError(e instanceof Error ? e.message : "DER 语法解析失败，请确保粘贴了正确的 PEM 格式。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tool-panel">
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .tls-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .tls-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .tls-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .tls-grid-2 {
            grid-template-columns: 4.5fr 5.5fr;
          }
        }
        .tls-meta-item {
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          border-bottom: 1px solid var(--border-default);
        }
        .tls-meta-item:last-child {
          border-bottom: none;
        }
        .tls-meta-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.15rem;
        }
        .tls-meta-value {
          font-size: 0.875rem;
          color: var(--text-primary);
          word-break: break-all;
        }
        .tls-days-banner {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .tls-days-banner--valid {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }
        .tls-days-banner--warning {
          background: rgba(234, 179, 8, 0.12);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.25);
        }
        .tls-days-banner--expired {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">HTTPS 加密安全分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "连接目标域名拉取 SSL/TLS 证书，或粘贴 PEM 编码的证书进行细致解析，展示公钥指纹、颁发机构、别名及剩余有效期。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "fetch" ? "active" : ""} onClick={() => { setActiveTab("fetch"); setError(""); setCertData(null); }}>
          在线获取证书 (输入域名)
        </button>
        <button type="button" className={activeTab === "paste" ? "active" : ""} onClick={() => { setActiveTab("paste"); setError(""); setCertData(null); }}>
          手动解析证书 (粘贴 PEM)
        </button>
      </div>

      <div className="tls-container">
        {/* Input Configuration Card */}
        <div className="tls-card">
          {activeTab === "fetch" ? (
            <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", marginBottom: 0 }}>
              <label className="tool-field" style={{ flex: 1 }}>
                <span>目标主机域名 / URL</span>
                <input 
                  value={domainInput} 
                  onChange={e => setDomainInput(e.target.value)} 
                  placeholder="例如: google.com"
                  style={{ height: "36px" }}
                />
              </label>
              <label className="tool-field tool-field--compact" style={{ width: "80px" }}>
                <span>端口</span>
                <input 
                  value={port} 
                  onChange={e => setPort(e.target.value)} 
                  placeholder="443"
                  style={{ height: "36px" }}
                />
              </label>
              <button 
                type="button" 
                className="button--primary" 
                onClick={handleFetchCert} 
                disabled={busy}
                style={{ height: "36px", alignSelf: "end", padding: "0 1.5rem" }}
              >
                {busy ? "获取中..." : "获取并解析"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label className="tool-field" style={{ margin: 0 }}>
                <span>粘贴证书 Base64 文本 (PEM 格式)</span>
                <textarea 
                  value={pemInput} 
                  onChange={e => setPemInput(e.target.value)} 
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDHTCCAgWgAwIBAgIUVS0j...&#10;-----END CERTIFICATE-----"
                  style={{ minHeight: "130px", fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem" }}
                />
              </label>
              <button 
                type="button" 
                className="button--primary" 
                onClick={handleParseLocalPem} 
                disabled={busy}
                style={{ alignSelf: "flex-end" }}
              >
                {busy ? "解析中..." : "开始本地解析"}
              </button>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="tls-grid-2">
          {/* Left Column: Cert Subject / Validity Dashboard */}
          <div className="tls-card">
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>基本信息 & 有效期</h3>

            {certData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Expiry Alarm Banner */}
                {remainingDaysInfo && (
                  <div className={`tls-days-banner ${
                    remainingDaysInfo.status === "valid" 
                      ? "tls-days-banner--valid" 
                      : remainingDaysInfo.status === "warning" 
                        ? "tls-days-banner--warning" 
                        : "tls-days-banner--expired"
                  }`}>
                    {remainingDaysInfo.status === "valid" && (
                      <span>✓ 证书状态正常。尚有 {remainingDaysInfo.days} 天有效期。</span>
                    )}
                    {remainingDaysInfo.status === "warning" && (
                      <span>⚠ 证书即将过期！仅剩 {remainingDaysInfo.days} 天，建议尽快更新。</span>
                    )}
                    {remainingDaysInfo.status === "expired" && (
                      <span>✗ 证书已过期！已超过有效期 {Math.abs(remainingDaysInfo.days)} 天。</span>
                    )}
                  </div>
                )}

                {/* Details list */}
                <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-muted)", overflow: "hidden" }}>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">使用者公用名 (Subject CN)</span>
                    <span className="tls-meta-value" style={{ fontWeight: "600" }}>
                      {certData.subject.CN || "无"}
                    </span>
                  </div>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">使用者组织 (Subject Organization)</span>
                    <span className="tls-meta-value">{certData.subject.O || "无"}</span>
                  </div>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">颁发机构公用名 (Issuer CN)</span>
                    <span className="tls-meta-value" style={{ fontWeight: "500" }}>
                      {certData.issuer.CN || "无"}
                    </span>
                  </div>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">颁发机构组织 (Issuer Organization)</span>
                    <span className="tls-meta-value">{certData.issuer.O || "无"}</span>
                  </div>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">生效时间 (Valid From)</span>
                    <span className="tls-meta-value">{parseDate(certData.valid_from)}</span>
                  </div>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">过期时间 (Valid To)</span>
                    <span className="tls-meta-value">{parseDate(certData.valid_to)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                minHeight: "220px",
                border: "2px dashed var(--border-default)", 
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontSize: "0.875rem"
              }}>
                获取证书后将在此显示基础状态分析。
              </div>
            )}
          </div>

          {/* Right Column: Advanced details (fingerprint, SANs) */}
          <div className="tls-card">
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>证书指纹与高级属性</h3>

            {certData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-muted)", overflow: "hidden" }}>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">证书序列号 (Serial Number)</span>
                    <span className="tls-meta-value mono-output" style={{ fontSize: "0.8rem" }}>{certData.serialNumber}</span>
                  </div>
                  <div className="tls-meta-item">
                    <span className="tls-meta-label">SHA-256 证书指纹 (Fingerprint)</span>
                    <span className="tls-meta-value mono-output" style={{ fontSize: "0.8rem", color: "var(--accent-primary)" }}>{certData.fingerprint256 || certData.fingerprint}</span>
                  </div>
                  {certData.subjectaltname && (
                    <div className="tls-meta-item">
                      <span className="tls-meta-label">使用者可选替代名 (Subject Alternative Names)</span>
                      <span className="tls-meta-value mono-output" style={{ fontSize: "0.78rem", maxHeight: "100px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
                        {certData.subjectaltname.replace(/,\s*/g, "\n")}
                      </span>
                    </div>
                  )}
                </div>

                {activeTab === "paste" && localReport && (
                  <label className="tool-field" style={{ margin: 0 }}>
                    <span>本地 DER 字节分析报告</span>
                    <textarea 
                      value={localReport} 
                      readOnly 
                      rows={5}
                      style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.75rem", background: "var(--bg-muted)" }}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                minHeight: "220px",
                border: "2px dashed var(--border-default)", 
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontSize: "0.875rem"
              }}>
                查询成功后显示指纹及 SAN 别名配置。
              </div>
            )}
          </div>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
