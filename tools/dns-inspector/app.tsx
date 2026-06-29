"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type RecordType = "ALL" | "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "CAA";
type Provider = "cloudflare" | "google" | "local";

interface DnsRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DnsQuestion {
  name: string;
  type: number;
}

interface DnsResponse {
  Status: number;
  TC?: boolean;
  RD?: boolean;
  RA?: boolean;
  AD?: boolean;
  CD?: boolean;
  Question?: DnsQuestion[];
  Answer?: DnsRecord[];
  Authority?: DnsRecord[];
}

interface QueryResult {
  type: string;
  status: number;
  flags: string[];
  answers: DnsRecord[];
  authority: DnsRecord[];
}

const recordTypes: RecordType[] = ["ALL", "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA"];
const typeLabels: Record<number, string> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  6: "SOA",
  15: "MX",
  16: "TXT",
  28: "AAAA",
  257: "CAA"
};
const statusLabels: Record<number, string> = {
  0: "NOERROR",
  1: "FORMERR",
  2: "SERVFAIL",
  3: "NXDOMAIN",
  4: "NOTIMP",
  5: "REFUSED"
};

function normalizeDomain(value: string) {
  const trimmed = value.trim();

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).hostname;
    }
  } catch {
    return trimmed;
  }

  return trimmed.replace(/^dns:\/\//i, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
}

function queryTypes(selected: RecordType) {
  return selected === "ALL" ? recordTypes.filter((type) => type !== "ALL") : [selected];
}

function responseFlags(response: DnsResponse) {
  return [
    response.TC ? "TC" : "",
    response.RD ? "RD" : "",
    response.RA ? "RA" : "",
    response.AD ? "AD" : "",
    response.CD ? "CD" : ""
  ].filter(Boolean);
}

async function queryDns(provider: Provider, domain: string, type: string): Promise<QueryResult> {
  if (provider === "local") {
    // Call server-side local DNS resolver (supports hosts, intranets, private records)
    const response = await fetch("/api/dns-resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, recordType: type })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `本地 DNS 解析请求失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      type,
      status: data.success ? 0 : 2,
      flags: ["LocalServer"],
      answers: data.answers ?? [],
      authority: []
    };
  }

  // Cloudflare or Google public DoH
  const endpoint = provider === "cloudflare"
    ? `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`
    : `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/dns-json"
    }
  });

  if (!response.ok) {
    throw new Error(`${provider} returned HTTP ${response.status}`);
  }

  const data = await response.json() as DnsResponse;

  return {
    type,
    status: data.Status,
    flags: responseFlags(data),
    answers: data.Answer ?? [],
    authority: data.Authority ?? []
  };
}

function recordTypeName(record: DnsRecord) {
  return typeLabels[record.type] ?? String(record.type);
}

export default function DnsInspectorTool({ manifest }: ToolAppProps) {
  const [domain, setDomain] = useState("example.com");
  const [recordType, setRecordType] = useState<RecordType>("ALL");
  const [provider, setProvider] = useState<Provider>("cloudflare");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const records = useMemo(() => results.flatMap((result) => result.answers.map((record) => ({
    ...record,
    queryType: result.type,
    section: "Answer"
  })).concat(result.authority.map((record) => ({
    ...record,
    queryType: result.type,
    section: "Authority"
  })))), [results]);
  
  const statuses = results.map((result) => `${result.type}: ${statusLabels[result.status] ?? result.status}`).join(" / ");

  async function inspect() {
    const normalized = normalizeDomain(domain);

    if (!normalized) {
      setError("请输入域名");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const nextResults = await Promise.all(queryTypes(recordType).map((type) => queryDns(provider, normalized, type)));

      setDomain(normalized);
      setResults(nextResults);
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : "DNS 查询失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">DNS 调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "查询并诊断域名的 DNS 解析记录。支持 Cloudflare/Google 公共 DoH 以及本地服务器 DNS 解析以排查局域网及 Hosts 映射。"}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>域名 / 主机名</span>
          <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="如 example.com 或 db.local" style={{ height: "36px" }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>记录类型</span>
          <select value={recordType} onChange={(event) => setRecordType(event.target.value as RecordType)} style={{ height: "36px" }}>
            {recordTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>DNS 查询服务器</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} style={{ height: "36px" }}>
            <option value="cloudflare">Cloudflare DoH (公网推荐)</option>
            <option value="google">Google DoH (公网推荐)</option>
            <option value="local">本地系统 DNS (支持 Hosts & 内网域名)</option>
          </select>
        </label>
        <button type="button" onClick={() => void inspect()} disabled={busy} style={{ height: "36px", alignSelf: "end" }}>{busy ? "查询中..." : "查询 DNS"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>查询数量</h3>
          <p>{results.length}</p>
        </article>
        <article className="detail-card">
          <h3>解析记录</h3>
          <p>{records.length}</p>
        </article>
        <article className="detail-card">
          <h3>回应状态</h3>
          <p>{statuses || "无"}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "6rem minmax(10rem, 1.2fr) 5rem 5rem minmax(12rem, 1.6fr)" }}>
          <span>类型</span>
          <span>主机记录</span>
          <span>类型值</span>
          <span>TTL</span>
          <span>数据值 (Value)</span>
        </div>
        {records.length > 0 ? records.map((record, index) => (
          <div key={`${record.queryType}-${record.name}-${record.type}-${record.data}-${index}`} className="tool-table__row" style={{ gridTemplateColumns: "6rem minmax(10rem, 1.2fr) 5rem 5rem minmax(12rem, 1.6fr)" }}>
            <span className="pill" style={{ fontSize: "0.72rem", backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", textAlign: "center", display: "inline-block", width: "fit-content" }}>{record.queryType}</span>
            <span className="mono-output" style={{ fontSize: "0.825rem" }}>{record.name}</span>
            <span style={{ fontWeight: "600" }}>{recordTypeName(record)}</span>
            <span>{record.TTL}</span>
            <span className="mono-output" style={{ fontSize: "0.825rem", wordBreak: "break-all", whiteSpace: "pre-line" }}>{record.data}</span>
          </div>
        )) : (
          <div className="tool-table__row" style={{ gridTemplateColumns: "1fr", textAlign: "center", padding: "1.5rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>暂无解析结果。输入域名并点击查询以查看解析明细。</span>
          </div>
        )}
      </div>

      {results.some((result) => result.flags.length > 0) ? (
        <p className="tool-note" style={{ marginTop: "1rem" }}>
          响应协议 Flags / 说明：{results.map((result) => `${result.type}=${result.flags.join(",") || "无"}`).join(" / ")}
        </p>
      ) : null}
      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
