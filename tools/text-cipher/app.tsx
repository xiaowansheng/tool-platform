"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Mode = "encrypt" | "decrypt";

const algorithms = [
  { value: "AES-GCM", label: "AES-256-GCM（推荐）", ivLength: 12 },
  { value: "AES-CTR", label: "AES-256-CTR", ivLength: 16 },
  { value: "AES-CBC", label: "AES-256-CBC", ivLength: 16 }
] as const;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s/g, "");
  if (cleaned.length % 2 !== 0) throw new Error("Hex 字符串长度必须为偶数");
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return bytes;
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(""));
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, algorithm: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: encoder.encode("tool-platform-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export default function TextCipherTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [algorithmIdx, setAlgorithmIdx] = useState(0);
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const algo = algorithms[algorithmIdx]!;

  function resetOutput() {
    setOutput("");
    setCopied(false);
    setError("");
  }

  async function handleProcess() {
    try {
      if (!password) throw new Error("请输入加密密钥/密码");
      if (!input) throw new Error("请输入要处理的文本");

      const key = await deriveKey(password, algo.value);

      if (mode === "encrypt") {
        const iv = new Uint8Array(algo.ivLength);
        crypto.getRandomValues(iv);
        const encrypted = await crypto.subtle.encrypt(
          { name: algo.value, iv } as AesGcmParams,
          key,
          new TextEncoder().encode(input) as unknown as BufferSource
        );
        // Format: base64(iv) + "." + base64(ciphertext)
        setOutput(bufToBase64(iv.buffer) + "." + bufToBase64(encrypted));
      } else {
        const parts = input.split(".");
        if (parts.length !== 2) throw new Error("密文格式应为 base64(iv).base64(ciphertext)");
        const iv = base64ToBuf(parts[0]!);
        const ciphertext = base64ToBuf(parts[1]!);
        const decrypted = await crypto.subtle.decrypt(
          { name: algo.value, iv } as AesGcmParams,
          key,
          ciphertext as unknown as BufferSource
        );
        setOutput(new TextDecoder().decode(decrypted));
      }
      setError("");
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
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
          <p className="eyebrow">对称加密</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>操作模式</span>
          <select value={mode} onChange={(e) => { setMode(e.target.value as Mode); resetOutput(); }}>
            <option value="encrypt">加密</option>
            <option value="decrypt">解密</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>算法</span>
          <select value={algorithmIdx} onChange={(e) => { setAlgorithmIdx(Number(e.target.value)); resetOutput(); }}>
            {algorithms.map((a, i) => (
              <option key={a.value} value={i}>{a.label}</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>密钥/密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); resetOutput(); }}
            placeholder="输入加密密码"
          />
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>{mode === "encrypt" ? "明文" : "密文"}</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); resetOutput(); }}
            spellCheck={false}
            placeholder={mode === "encrypt" ? "输入要加密的文本..." : "输入 base64(iv).base64(ciphertext) 格式的密文..."}
          />
        </label>
        <label className="tool-field">
          <span>{mode === "encrypt" ? "密文（Base64）" : "明文"}</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleProcess()}>
          {mode === "encrypt" ? "加密" : "解密"}
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">
        使用 PBKDF2（100,000 次迭代）从密码派生 AES-256 密钥。密文格式为 base64(IV).base64(ciphertext)。
        所有计算在浏览器本地完成。
      </p>
    </section>
  );
}
