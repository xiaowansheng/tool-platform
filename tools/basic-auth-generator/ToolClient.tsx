"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary);
}

export default function BasicAuthGeneratorTool({ manifest }: ToolClientProps) {
  const [username, setUsername] = useState("tool-user");
  const [password, setPassword] = useState("secret");
  const [copied, setCopied] = useState(false);
  const token = encodeBase64(`${username}:${password}`);
  const header = `Authorization: Basic ${token}`;

  async function copyHeader() {
    await navigator.clipboard.writeText(header);
    setCopied(true);
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
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyHeader()}>{copied ? "已复制" : "复制 Header"}</button>
      </div>
      <label className="tool-field">
        <span>Authorization Header</span>
        <textarea value={header} readOnly spellCheck={false} />
      </label>
      <p className="tool-note">不要把真实生产凭据粘贴到不可信页面；本工具不上传任何内容。</p>
    </section>
  );
}
