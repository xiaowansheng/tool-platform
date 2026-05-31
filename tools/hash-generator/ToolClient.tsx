"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;

const algorithmNotes: Record<HashAlgorithm, string> = {
  "SHA-1": "兼容旧系统，不建议用于安全场景",
  "SHA-256": "常用默认选择",
  "SHA-384": "更长摘要，适合高完整性校验",
  "SHA-512": "最长摘要，输出体积也最大"
};

type HashAlgorithm = (typeof algorithms)[number];

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function HashGeneratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Tool Platform");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [digest, setDigest] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    try {
      const bytes = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest(algorithm, bytes);

      setDigest(toHex(hash));
      setError("");
      setCopied(false);
    } catch (digestError) {
      setError(digestError instanceof Error ? digestError.message : "摘要生成失败");
    }
  }

  async function handleCopy() {
    if (!digest) {
      return;
    }

    await navigator.clipboard.writeText(digest);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">内容摘要</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>摘要算法</span>
          <select value={algorithm} onChange={(event) => { setAlgorithm(event.target.value as HashAlgorithm); setCopied(false); }}>
            {algorithms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void handleGenerate()}>
          生成摘要
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!digest}>
          {copied ? "已复制" : "复制摘要"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入内容</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>十六进制摘要</span>
          <textarea value={digest} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字节</h3>
          <p>{new TextEncoder().encode(input).byteLength}</p>
        </article>
        <article className="detail-card">
          <h3>摘要长度</h3>
          <p>{digest ? `${digest.length * 4} 位` : "待生成"}</p>
        </article>
        <article className="detail-card">
          <h3>算法提示</h3>
          <p>{algorithmNotes[algorithm]}</p>
        </article>
      </div>
      <p className="tool-note">哈希摘要适合完整性校验和内容比对；密码存储请使用专门的慢哈希算法和随机盐。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
