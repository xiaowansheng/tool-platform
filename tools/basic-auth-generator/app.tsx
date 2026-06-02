"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary);
}

export default function BasicAuthGeneratorTool({ manifest }: ToolAppProps) {
  const [username, setUsername] = useState("tool-user");
  const [password, setPassword] = useState("secret");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const token = encodeBase64(username + ":" + password);
  const header = "Authorization: Basic " + token;
  const credentialBytes = new TextEncoder().encode(username + ":" + password).length;

  async function copyText(value: string, type: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      setCopyError("");
      setTimeout(() => setCopied(""), 2000);
    } catch (error) {
      setCopyError("复制失败，请检查权限");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">认证调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>用户名</span>
          <input value={username} onChange={(event) => { setUsername(event.target.value); setCopied(""); }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>密码</span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => { setPassword(event.target.value); setCopied(""); }}
          />
        </label>
        <button type="button" onClick={() => setShowPassword((current) => !current)}>
          {showPassword ? "隐藏密码" : "显示密码"}
        </button>
        <button type="button" className="button--primary" onClick={() => void copyText(header, "header")}>
          {copied === "header" ? "已复制 Header" : "复制 Header"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>凭据字节</h3>
          <p>{credentialBytes}</p>
        </article>
        <article className="detail-card">
          <h3>Token 长度</h3>
          <p>{token.length}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Authorization 头</span>
          <textarea value={header} readOnly spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Base64 Token</span>
          <textarea value={token} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyText(token, "token")}>
          {copied === "token" ? "已复制 Token" : "复制 Token"}
        </button>
      </div>
      {copyError ? <p className="tool-error">{copyError}</p> : null}
      <p className="tool-note">Basic Auth 只是编码用户名和密码，不是加密；请只在 HTTPS 请求和可信调试环境中使用。</p>
    </section>
  );
}
