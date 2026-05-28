"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return "No JWT payload";
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  return JSON.stringify(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)))), null, 2);
}

export default function OAuthOidcDebuggerTool({ manifest }: ToolClientProps) {
  const [authUrl, setAuthUrl] = useState("https://issuer.example/authorize?client_id=tool-client&response_type=code&scope=openid%20profile&redirect_uri=https://app.example/callback&state=abc");
  const [idToken, setIdToken] = useState("");
  const [verifier, setVerifier] = useState("tool-platform-pkce-verifier");
  const [challenge, setChallenge] = useState("");

  let params: Array<[string, string]> = [];
  let urlError = "";

  try {
    const url = new URL(authUrl);
    params = Array.from(url.searchParams.entries());
  } catch (error) {
    urlError = error instanceof Error ? error.message : "授权 URL 解析失败";
  }

  async function generatePkce() {
    setChallenge(await pkceChallenge(verifier));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Identity Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>Authorization URL</span>
        <textarea value={authUrl} onChange={(event) => setAuthUrl(event.target.value)} spellCheck={false} />
      </label>
      {urlError ? <p className="tool-error">{urlError}</p> : null}
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head"><span>Param</span><span>Value</span></div>
        {params.map(([key, value]) => <div key={`${key}-${value}`} className="tool-table__row"><span>{key}</span><span>{value}</span></div>)}
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>ID Token</span>
          <textarea value={idToken} onChange={(event) => setIdToken(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>ID Token Payload</span>
          <textarea value={idToken ? decodeJwtPayload(idToken) : "粘贴 ID Token 以解码 payload"} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>PKCE</span>
          <textarea value={`verifier: ${verifier}\nchallenge: ${challenge}`} onChange={(event) => setVerifier(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void generatePkce()}>生成 S256 Challenge</button>
      </div>
    </section>
  );
}
