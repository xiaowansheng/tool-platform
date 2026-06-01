"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Provider = "github" | "stripe" | "slack";

const sampleBody = "{\"action\":\"opened\"}";
const sampleSignature = "sha256=931f7549cb28864ede02887873140d15dc87d237f31caea0af7e915b292dff26";

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function buildSignedPayload(provider: Provider, body: string, timestamp: string) {
  if (provider === "stripe") return `${timestamp}.${body}`;
  if (provider === "slack") return `v0:${timestamp}:${body}`;
  return body;
}

function prefix(provider: Provider) {
  if (provider === "github") return "sha256=";
  if (provider === "slack") return "v0=";
  return "";
}

function signatureCandidates(provider: Provider, header: string) {
  const trimmed = header.trim();

  if (provider !== "stripe") {
    return [trimmed];
  }

  const v1Values = trimmed
    .split(",")
    .map((part) => part.trim().split("="))
    .filter(([key, value]) => key === "v1" && Boolean(value))
    .map(([, value]) => value ?? "");

  return v1Values.length > 0 ? v1Values : [trimmed];
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

export default function WebhookSignatureVerifierTool({ manifest }: ToolClientProps) {
  const [provider, setProvider] = useState<Provider>("github");
  const [secret, setSecret] = useState("webhook-secret");
  const [timestamp, setTimestamp] = useState(Math.floor(Date.now() / 1000).toString());
  const [body, setBody] = useState(sampleBody);
  const [signature, setSignature] = useState(sampleSignature);
  const [result, setResult] = useState("尚未验证");
  const [expectedHeader, setExpectedHeader] = useState(sampleSignature);
  const [copied, setCopied] = useState(false);

  async function verify() {
    const digest = await hmacSha256(secret, buildSignedPayload(provider, body, timestamp));
    const expected = `${prefix(provider)}${digest}`;
    const nextExpectedHeader = provider === "stripe" ? `t=${timestamp},v1=${digest}` : expected;
    const valid = signatureCandidates(provider, signature).some((candidate) => timingSafeEqual(candidate, expected));

    setExpectedHeader(nextExpectedHeader);
    setResult(valid ? "签名有效" : "签名无效，请核对密钥、时间戳和原始 Body");
    setCopied(false);
  }

  async function copyExpectedHeader() {
    await navigator.clipboard.writeText(expectedHeader);
    setCopied(true);
  }

  function loadGithubExample() {
    setProvider("github");
    setSecret("webhook-secret");
    setTimestamp(Math.floor(Date.now() / 1000).toString());
    setBody(sampleBody);
    setSignature(sampleSignature);
    setExpectedHeader(sampleSignature);
    setResult("尚未验证");
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Webhook 签名</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>平台</span>
          <select value={provider} onChange={(event) => { setProvider(event.target.value as Provider); setCopied(false); }}>
            <option value="github">GitHub</option>
            <option value="stripe">Stripe</option>
            <option value="slack">Slack</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact"><span>签名密钥</span><input value={secret} onChange={(event) => { setSecret(event.target.value); setCopied(false); }} /></label>
        <label className="tool-field tool-field--compact"><span>时间戳</span><input value={timestamp} onChange={(event) => { setTimestamp(event.target.value); setCopied(false); }} /></label>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>原始 Body</span><textarea value={body} onChange={(event) => { setBody(event.target.value); setCopied(false); }} spellCheck={false} /></label>
        <label className="tool-field"><span>签名请求头</span><textarea value={signature} onChange={(event) => { setSignature(event.target.value); setCopied(false); }} spellCheck={false} /></label>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void verify()}>验证签名</button>
        <button type="button" onClick={loadGithubExample}>GitHub 示例</button>
        <button type="button" onClick={() => void copyExpectedHeader()}>{copied ? "已复制期望值" : "复制期望请求头"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>验证结果</h3><p>{result}</p></article>
        <article className="detail-card"><h3>签名载荷</h3><p>{provider === "github" ? "请求体" : provider === "stripe" ? "时间戳.请求体" : "v0:时间戳:请求体"}</p></article>
      </div>
      <label className="tool-field"><span>期望请求头 / 结果</span><textarea value={`${result}\n${expectedHeader}`} readOnly spellCheck={false} /></label>
      <p className="tool-note">校验时必须使用平台实际收到的原始 Body，格式化 JSON 或改变换行都会导致 HMAC 不一致。</p>
    </section>
  );
}
