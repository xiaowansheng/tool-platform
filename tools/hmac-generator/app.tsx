"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type HashAlgorithm = (typeof algorithms)[number];

const algorithmLabels: Record<HashAlgorithm, string> = {
  "SHA-1": "SHA-1（兼容旧系统）",
  "SHA-256": "SHA-256（推荐）",
  "SHA-384": "SHA-384",
  "SHA-512": "SHA-512"
};

type InputEncoding = "text" | "hex" | "base64";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(buffer: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buffer), (b) => String.fromCharCode(b)).join(""));
}

function decodeInput(input: string, encoding: InputEncoding): Uint8Array {
  switch (encoding) {
    case "text":
      return new TextEncoder().encode(input);
    case "hex": {
      const cleaned = input.replace(/\s/g, "");
      if (cleaned.length % 2 !== 0) throw new Error("Hex 输入长度必须为偶数");
      const bytes = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < cleaned.length; i += 2) {
        bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
        if (isNaN(bytes[i / 2]!)) throw new Error("无效的 Hex 字符");
      }
      return bytes;
    }
    case "base64": {
      const binary = atob(input);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
  }
}

export default function HmacGeneratorTool({ manifest }: ToolAppProps) {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [keyInput, setKeyInput] = useState("my-secret-key");
  const [keyEncoding, setKeyEncoding] = useState<InputEncoding>("text");
  const [message, setMessage] = useState("Hello, World!");
  const [messageEncoding, setMessageEncoding] = useState<InputEncoding>("text");
  const [output, setOutput] = useState("");
  const [outputFormat, setOutputFormat] = useState<"hex" | "base64">("hex");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function resetOutput() {
    setOutput("");
    setCopied(false);
    setError("");
  }

  async function handleGenerate() {
    try {
      const keyBytes = decodeInput(keyInput, keyEncoding);
      const msgBytes = decodeInput(message, messageEncoding);

      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyBytes as unknown as BufferSource,
        { name: "HMAC", hash: algorithm },
        false, ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes as unknown as BufferSource);

      setOutput(outputFormat === "hex" ? toHex(signature) : toBase64(signature));
      setError("");
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "HMAC 计算失败");
      setOutput("");
    }
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">消息认证</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>哈希算法</span>
          <select value={algorithm} onChange={(e) => { setAlgorithm(e.target.value as HashAlgorithm); resetOutput(); }}>
            {algorithms.map((a) => (
              <option key={a} value={a}>{algorithmLabels[a]}</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={outputFormat} onChange={(e) => { setOutputFormat(e.target.value as "hex" | "base64"); resetOutput(); }}>
            <option value="hex">Hex</option>
            <option value="base64">Base64</option>
          </select>
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <div>
          <label className="tool-field tool-field--compact">
            <span>密钥编码</span>
            <select value={keyEncoding} onChange={(e) => { setKeyEncoding(e.target.value as InputEncoding); resetOutput(); }}>
              <option value="text">UTF-8 文本</option>
              <option value="hex">Hex</option>
              <option value="base64">Base64</option>
            </select>
          </label>
          <label className="tool-field">
            <span>密钥</span>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); resetOutput(); }}
              placeholder="输入密钥"
              spellCheck={false}
            />
          </label>
        </div>
        <div>
          <label className="tool-field tool-field--compact">
            <span>消息编码</span>
            <select value={messageEncoding} onChange={(e) => { setMessageEncoding(e.target.value as InputEncoding); resetOutput(); }}>
              <option value="text">UTF-8 文本</option>
              <option value="hex">Hex</option>
              <option value="base64">Base64</option>
            </select>
          </label>
          <label className="tool-field">
            <span>消息</span>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); resetOutput(); }}
              spellCheck={false}
              placeholder="输入要签名的消息"
            />
          </label>
        </div>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleGenerate()}>
          计算 HMAC
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      <label className="tool-field">
        <span>HMAC ({outputFormat.toUpperCase()})</span>
        <input type="text" value={output} readOnly spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>算法</h3>
          <p>HMAC-{algorithm}</p>
        </article>
        <article className="detail-card">
          <h3>密钥长度</h3>
          <p>{keyInput.length} 字符</p>
        </article>
        <article className="detail-card">
          <h3>摘要长度</h3>
          <p>{algorithm.replace("SHA-", "")} 位</p>
        </article>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">
        HMAC 用于验证消息的完整性和真实性，常用于 API 签名（如 AWS Signature、Webhook 验证）。推荐使用 SHA-256 或更高。
      </p>
    </section>
  );
}
