"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface ParsedHeader {
  name: string;
  value: string;
}

const sampleHeaders = `Host: api.example.com
X-Forwarded-For: 203.0.113.10, 10.0.1.20, 10.0.2.30
X-Forwarded-Proto: https
X-Forwarded-Host: api.example.com
X-Real-IP: 203.0.113.10
Forwarded: for=203.0.113.10;proto=https;host=api.example.com
Via: 1.1 edge-proxy, 1.1 internal-proxy`;

function parseHeaders(input: string): ParsedHeader[] {
  const headers: ParsedHeader[] = [];
  let current: ParsedHeader | null = null;

  for (const rawLine of input.split(/\r?\n/)) {
    if (/^\s/.test(rawLine) && current) {
      current.value += ` ${rawLine.trim()}`;
      continue;
    }

    const separator = rawLine.indexOf(":");
    if (separator <= 0) continue;

    current = {
      name: rawLine.slice(0, separator).trim(),
      value: rawLine.slice(separator + 1).trim()
    };
    headers.push(current);
  }

  return headers;
}

function getHeader(headers: ParsedHeader[], name: string) {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseForwarded(value: string) {
  return value
    .split(",")
    .flatMap((segment) => segment.split(";"))
    .map((part) => part.trim().split("="))
    .filter(([key, val]) => key && val)
    .map(([key, val]) => ({
      key: key.toLowerCase(),
      value: val.replace(/^"|"$/g, "")
    }));
}

function analyze(input: string, trustedHops: number) {
  const headers = parseHeaders(input);
  const xff = getHeader(headers, "x-forwarded-for")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const forwarded = parseForwarded(getHeader(headers, "forwarded"));
  const forwardedFor = forwarded.filter((item) => item.key === "for").map((item) => item.value);
  const chain = xff.length > 0 ? xff : forwardedFor;
  const clientIp = chain.length > trustedHops ? chain[chain.length - trustedHops - 1] : chain[0] ?? getHeader(headers, "x-real-ip");
  const proto = getHeader(headers, "x-forwarded-proto") || forwarded.find((item) => item.key === "proto")?.value || "-";
  const host = getHeader(headers, "x-forwarded-host") || forwarded.find((item) => item.key === "host")?.value || getHeader(headers, "host") || "-";
  const via = getHeader(headers, "via").split(",").map((item) => item.trim()).filter(Boolean);
  const risks = [];

  if (chain.length === 0) risks.push("没有发现 X-Forwarded-For 或 Forwarded for，无法推导客户端链路。");
  if (chain.length <= trustedHops && chain.length > 0) risks.push("trusted hops 大于或等于链路长度，客户端 IP 可能被错误地信任。");
  if (getHeader(headers, "x-forwarded-for") && getHeader(headers, "forwarded")) risks.push("同时存在 X-Forwarded-For 和 Forwarded，需要明确优先级，避免链路不一致。");
  if (proto !== "https") risks.push("推导协议不是 https，检查 TLS termination 和 redirect 逻辑。");
  if (chain.some((ip) => ip === "unknown" || ip.startsWith("_"))) risks.push("链路中存在 unknown/混淆标识，不应直接用于审计或限流。");

  return { headers, chain, clientIp, proto, host, via, risks };
}

export default function ReverseProxyHeaderAnalyzerTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleHeaders);
  const [trustedHops, setTrustedHops] = useState(2);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => analyze(input, trustedHops), [input, trustedHops]);
  const report = JSON.stringify(result, null, 2);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">网络工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>信任代理跳数</span>
          <input type="number" min="0" max="20" value={trustedHops} onChange={(event) => setTrustedHops(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => setInput(sampleHeaders)}>加载示例</button>
        <button type="button" onClick={() => void copyReport()}>{copied ? "已复制" : "复制报告"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>客户端 IP</h3><p>{result.clientIp || "-"}</p></article>
        <article className="detail-card"><h3>协议</h3><p>{result.proto}</p></article>
        <article className="detail-card"><h3>主机</h3><p>{result.host}</p></article>
        <article className="detail-card"><h3>风险数</h3><p>{result.risks.length}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>原始 Headers</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <div className="workspace workspace--stack">
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head"><span>跳数</span><span>地址</span></div>
            {result.chain.map((ip, index) => (
              <div className="tool-table__row" key={`${ip}-${index}`}>
                <span>{index + 1}</span>
                <span>{ip}</span>
              </div>
            ))}
          </div>
          {result.risks.map((risk) => <p className="tool-error" key={risk}>{risk}</p>)}
          <label className="tool-field">
            <span>JSON 报告</span>
            <textarea value={report} readOnly spellCheck={false} />
          </label>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">只有最后一个可信代理写入或清洗过的转发头才适合作为鉴权、审计、限流依据；外部请求直接带来的 X-Forwarded-* 不应被默认信任。</p>
    </section>
  );
}
