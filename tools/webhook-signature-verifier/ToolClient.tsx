"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Provider = "github" | "stripe" | "slack";

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
  const [body, setBody] = useState('{"action":"opened"}');
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState("尚未验证");

  async function verify() {
    const digest = await hmacSha256(secret, buildSignedPayload(provider, body, timestamp));
    const expected = `${prefix(provider)}${digest}`;
    const expectedHeader = provider === "stripe" ? `t=${timestamp},v1=${digest}` : expected;
    const valid = signatureCandidates(provider, signature).some((candidate) => timingSafeEqual(candidate, expected));

    setResult(valid ? `Valid: ${expectedHeader}` : `Invalid. Expected: ${expectedHeader}`);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Webhook Security</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Provider</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>
            <option value="github">GitHub</option>
            <option value="stripe">Stripe</option>
            <option value="slack">Slack</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact"><span>Secret</span><input value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>Timestamp</span><input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} /></label>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>Body</span><textarea value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} /></label>
        <label className="tool-field"><span>Signature Header</span><textarea value={signature} onChange={(event) => setSignature(event.target.value)} spellCheck={false} /></label>
      </div>
      <div className="tool-toolbar"><button type="button" onClick={() => void verify()}>验证</button></div>
      <label className="tool-field"><span>Result</span><textarea value={result} readOnly spellCheck={false} /></label>
    </section>
  );
}
