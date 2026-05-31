"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const sampleText = "用户名:密码";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64StudioTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleText);
  const [output, setOutput] = useState(() => encodeBase64(sampleText));
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    return {
      inputBytes: new TextEncoder().encode(input).byteLength,
      outputChars: output.length,
      modeLabel: mode === "encode" ? "编码" : "解码"
    };
  }, [input, mode, output]);

  function handleEncode() {
    try {
      const encoded = encodeBase64(input);
      setMode("encode");
      setOutput(encoded);
      setError("");
      setCopied(false);
    } catch (encodeError) {
      setError(encodeError instanceof Error ? encodeError.message : "编码失败");
    }
  }

  function handleDecode() {
    try {
      const decoded = decodeBase64(input);
      setMode("decode");
      setOutput(decoded);
      setError("");
      setCopied(false);
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : "解码失败，请检查输入是否为有效 Base64 字符串");
    }
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  function loadBasicAuthExample() {
    setInput(sampleText);
    setOutput(encodeBase64(sampleText));
    setMode("encode");
    setError("");
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={handleEncode}>
          编码为 Base64
        </button>
        <button type="button" onClick={handleDecode}>
          解码为文本
        </button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制" : "复制输出"}
        </button>
        <button type="button" onClick={loadBasicAuthExample}>
          Basic Auth 示例
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入文本或 Base64</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出结果</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字节</h3>
          <p>{stats.inputBytes}</p>
        </article>
        <article className="detail-card">
          <h3>输出字符</h3>
          <p>{stats.outputChars}</p>
        </article>
        <article className="detail-card">
          <h3>当前模式</h3>
          <p>{stats.modeLabel}</p>
        </article>
      </div>
      <p className="tool-note">使用 UTF-8 处理中文和特殊字符；适合调试 Basic Auth、Data URL 和日志 payload。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
