"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;

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
          <p className="eyebrow">Developer Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>算法</span>
          <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}>
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
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>摘要</span>
          <textarea value={digest} onChange={(event) => setDigest(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字节</h3>
          <p>{new TextEncoder().encode(input).byteLength}</p>
        </article>
        <article className="detail-card">
          <h3>摘要长度</h3>
          <p>{digest ? `${digest.length * 4} bits` : "等待生成"}</p>
        </article>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
