"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
const sriAlgorithms = ["SHA-256", "SHA-384", "SHA-512"] as const;

const algorithmNotes: Record<HashAlgorithm, string> = {
  "SHA-1": "兼容旧系统，不建议用于安全场景",
  "SHA-256": "常用默认选择",
  "SHA-384": "更长摘要，适合高完整性校验",
  "SHA-512": "最长摘要，输出体积也最大"
};

type HashAlgorithm = (typeof algorithms)[number];
type OutputFormat = "hex" | "sri";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64(buffer: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(buffer), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

export default function HashGeneratorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("Tool Platform");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("hex");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const availableAlgorithms = outputFormat === "sri" ? sriAlgorithms : algorithms;
  const outputLabel = outputFormat === "sri" ? "SRI integrity" : "十六进制摘要";

  function resetOutput() {
    setOutput("");
    setCopied(false);
  }

  function handleFormatChange(nextFormat: OutputFormat) {
    setOutputFormat(nextFormat);
    if (nextFormat === "sri" && algorithm === "SHA-1") {
      setAlgorithm("SHA-256");
    }
    resetOutput();
  }

  async function handleGenerate() {
    try {
      const bytes = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest(algorithm, bytes);

      setOutput(outputFormat === "sri" ? `${algorithm.toLowerCase().replace("-", "")}-${toBase64(hash)}` : toHex(hash));
      setError("");
      setCopied(false);
    } catch (digestError) {
      setError(digestError instanceof Error ? digestError.message : "摘要生成失败");
    }
  }

  async function handleCopy() {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
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
          <span>输出格式</span>
          <select value={outputFormat} onChange={(event) => handleFormatChange(event.target.value as OutputFormat)}>
            <option value="hex">Hex digest</option>
            <option value="sri">SRI integrity</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>摘要算法</span>
          <select
            value={algorithm}
            onChange={(event) => {
              setAlgorithm(event.target.value as HashAlgorithm);
              resetOutput();
            }}
          >
            {availableAlgorithms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void handleGenerate()}>
          生成摘要
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制摘要"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入内容</span>
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              resetOutput();
            }}
            spellCheck={false}
          />
        </label>
        <label className="tool-field">
          <span>{outputLabel}</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字节</h3>
          <p>{new TextEncoder().encode(input).byteLength}</p>
        </article>
        <article className="detail-card">
          <h3>摘要长度</h3>
          <p>{algorithm.replace("SHA-", "")} 位</p>
        </article>
        <article className="detail-card">
          <h3>输出格式</h3>
          <p>{outputFormat === "sri" ? "Subresource Integrity" : "Hex digest"}</p>
        </article>
        <article className="detail-card">
          <h3>算法提示</h3>
          <p>{algorithmNotes[algorithm]}</p>
        </article>
      </div>
      <p className="tool-note">SRI 适合为脚本和样式生成 `integrity` 属性；密码存储请使用专门的慢哈希算法和随机盐。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
