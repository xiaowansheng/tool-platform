"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const sampleToken = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  "eyJzdWIiOiJ0b29sLXVzZXIiLCJyb2xlIjoiZGV2ZWxvcGVyIiwiZXhwIjoxOTIxODk2MDAwfQ",
  "signature"
].join(".");

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function decodeBase64Url(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function parseJsonSegment(segment: string) {
  return JSON.parse(decodeBase64Url(segment)) as Record<string, unknown>;
}

function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");

  if (parts.length < 2) {
    throw new Error("JWT 至少需要 header 和 payload 两段");
  }

  return {
    header: parseJsonSegment(parts[0] ?? ""),
    payload: parseJsonSegment(parts[1] ?? ""),
    signature: parts[2] ?? ""
  };
}

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function formatUnixClaim(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "未提供";
  }

  return new Date(value * 1000).toISOString();
}

export default function JwtDecoderTool({ manifest }: ToolClientProps) {
  const [token, setToken] = useState(sampleToken);
  const [copied, setCopied] = useState(false);

  let decoded: DecodedJwt | null = null;
  let error = "";

  try {
    decoded = decodeJwt(token);
  } catch (decodeError) {
    error = decodeError instanceof Error ? decodeError.message : "JWT 解码失败";
  }

  const header = decoded ? formatJson(decoded.header) : "";
  const payload = decoded ? formatJson(decoded.payload) : "";
  const expiresAt = decoded ? formatUnixClaim(decoded.payload.exp) : "未提供";
  const isExpired = typeof decoded?.payload.exp === "number" ? decoded.payload.exp * 1000 <= Date.now() : false;
  const signatureStatus = decoded?.signature ? "存在，未验证" : "缺失";

  async function handleCopyPayload() {
    if (!payload) {
      return;
    }

    await navigator.clipboard.writeText(payload);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">令牌调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => { setToken(sampleToken); setCopied(false); }}>
          填入示例 Token
        </button>
        <button type="button" onClick={() => void handleCopyPayload()} disabled={!payload}>
          {copied ? "已复制载荷" : "复制载荷"}
        </button>
      </div>
      <label className="tool-field">
        <span>JWT 输入</span>
        <textarea value={token} onChange={(event) => {
          setToken(event.target.value);
          setCopied(false);
        }} spellCheck={false} />
      </label>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Header 头部</span>
          <textarea value={header} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Payload 载荷</span>
          <textarea value={payload} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>算法</h3>
          <p>{decoded?.header.alg?.toString() ?? "未知"}</p>
        </article>
        <article className="detail-card">
          <h3>过期时间</h3>
          <p>{expiresAt}</p>
        </article>
        <article className="detail-card">
          <h3>状态</h3>
          <p>{isExpired ? "已过期" : "未过期 / 无 exp"}</p>
        </article>
        <article className="detail-card">
          <h3>签名</h3>
          <p>{signatureStatus}</p>
        </article>
      </div>
      <p className="tool-note">此工具只做本地解码，不验证签名，也不会上传 Token。需要验签时请使用 JWT JWK Verifier。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
