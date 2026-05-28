"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

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
  if (!header || !payload || !signature) throw new Error("JWT 必须包含 header.payload.signature");
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

export default function JwtJwkVerifierTool({ manifest }: ToolClientProps) {
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b29sLXVzZXIiLCJleHAiOjE5MjE4OTYwMDB9.signature");
  const [keyInput, setKeyInput] = useState("secret");
  const [result, setResult] = useState("尚未验证");

  let decoded = "";
  let decodeError = "";

  try {
    const parsed = parseJwt(token);
    decoded = JSON.stringify({ header: parsed.header, payload: parsed.payload }, null, 2);
  } catch (error) {
    decodeError = error instanceof Error ? error.message : "JWT 解码失败";
  }

  async function handleVerify() {
    try {
      const valid = await verifyJwt(token, keyInput);
      setResult(valid ? "Valid signature" : "Invalid signature");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "签名验证失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Security Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void handleVerify()}>验证签名</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JWT</span>
          <textarea value={token} onChange={(event) => setToken(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Secret or RSA public JWK</span>
          <textarea value={keyInput} onChange={(event) => setKeyInput(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Decoded</span>
          <textarea value={decoded || decodeError} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Verify Result</span>
          <textarea value={result} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
