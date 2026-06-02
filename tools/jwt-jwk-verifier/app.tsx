"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b29sLXVzZXIiLCJleHAiOjE5MjE4OTYwMDB9.1X88snyije7kdMku-ClPzUTJ3x0tkzbL1NKbkhEAzBI";
const sampleSecret = "secret";

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function parseJwt(token: string) {
  const [header = "", payload = "", signature = ""] = token.trim().split(".");
  if (!header || !payload || !signature) throw new Error("JWT 必须包含 header.payload.signature 三段");
  return {
    header: JSON.parse(base64UrlToText(header)) as Record<string, unknown>,
    payload: JSON.parse(base64UrlToText(payload)) as Record<string, unknown>,
    signature,
    signingInput: `${header}.${payload}`
  };
}

async function verifyJwt(token: string, keyInput: string) {
  const parsed = parseJwt(token);
  const algorithm = String(parsed.header.alg ?? "");
  const data = new TextEncoder().encode(parsed.signingInput);
  const signature = base64UrlToBytes(parsed.signature);

  if (algorithm === "HS256") {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyInput), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("HMAC", key, signature, data);
  }

  if (algorithm === "RS256") {
    const jwk = JSON.parse(keyInput) as JsonWebKey;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
  }

  throw new Error(`暂不支持 alg: ${algorithm}`);
}

export default function JwtJwkVerifierTool({ manifest }: ToolAppProps) {
  const [token, setToken] = useState(sampleToken);
  const [keyInput, setKeyInput] = useState(sampleSecret);
  const [result, setResult] = useState("尚未验证");
  const [copied, setCopied] = useState(false);

  let decoded = "";
  let decodeError = "";
  let algorithm = "未知";

  try {
    const parsed = parseJwt(token);
    algorithm = String(parsed.header.alg ?? "未知");
    decoded = JSON.stringify({ header: parsed.header, payload: parsed.payload }, null, 2);
  } catch (error) {
    decodeError = error instanceof Error ? error.message : "JWT 解码失败";
  }

  async function handleVerify() {
    try {
      const valid = await verifyJwt(token, keyInput);
      setResult(valid ? "签名有效" : "签名无效");
      setCopied(false);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "签名验证失败");
      setCopied(false);
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
  }

  function loadHs256Example() {
    setToken(sampleToken);
    setKeyInput(sampleSecret);
    setResult("尚未验证");
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">签名校验</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void handleVerify()} disabled={Boolean(decodeError)}>
          验证签名
        </button>
        <button type="button" onClick={loadHs256Example}>
          HS256 示例
        </button>
        <button type="button" onClick={() => void copyResult()}>
          {copied ? "已复制结果" : "复制结果"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JWT 输入</span>
          <textarea value={token} onChange={(event) => { setToken(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>HMAC 密钥或 RSA 公钥 JWK</span>
          <textarea value={keyInput} onChange={(event) => { setKeyInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>算法</h3>
          <p>{algorithm}</p>
        </article>
        <article className="detail-card">
          <h3>输入状态</h3>
          <p>{decodeError ? "待修正" : "可验证"}</p>
        </article>
        <article className="detail-card">
          <h3>验证结果</h3>
          <p>{result}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>解码内容</span>
          <textarea value={decoded || decodeError} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>校验结果</span>
          <textarea value={result} readOnly spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">支持 HS256 和 RS256。工具只在本地使用 Web Crypto 校验签名，不会把 Token 或密钥发送到服务器。</p>
    </section>
  );
}
