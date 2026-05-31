"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseQuery(input: string) {
  const query = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
  const params = new URLSearchParams(query);

  return Array.from(params.entries());
}

export default function UrlCodecTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("https://example.com/search?q=工具平台&runtime=worker");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"component" | "full">("component");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const queryEntries = useMemo(() => parseQuery(input), [input]);
  const modeLabel = mode === "component" ? "参数片段" : "完整 URL";

  function handleEncode() {
    try {
      setOutput(mode === "component" ? encodeURIComponent(input) : encodeURI(input));
      setError("");
      setCopied(false);
    } catch (encodeError) {
      setError(encodeError instanceof Error ? encodeError.message : "URL 编码失败");
    }
  }

  function handleDecode() {
    try {
      setOutput(mode === "component" ? decodeURIComponent(input) : decodeURI(input));
      setError("");
      setCopied(false);
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : "URL 解码失败");
    }
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  function loadExample() {
    setInput("https://example.com/search?q=工具平台&redirect=https%3A%2F%2Ftool.example%2Fcallback");
    setOutput("");
    setError("");
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">链接调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>处理模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as "component" | "full")}>
            <option value="component">参数片段 encodeURIComponent</option>
            <option value="full">完整 URL encodeURI</option>
          </select>
        </label>
        <button type="button" onClick={handleEncode}>
          编码
        </button>
        <button type="button" onClick={handleDecode}>
          解码
        </button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制" : "复制输出"}
        </button>
        <button type="button" onClick={loadExample}>
          填入示例
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>URL / 参数输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>{modeLabel}输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-card">
        <h3>查询参数预览</h3>
        <div className="tag-list">
          {queryEntries.length > 0 ? (
            queryEntries.map(([key, value]) => (
              <span key={`${key}-${value}`} className="tag">
                {key}: {value}
              </span>
            ))
          ) : (
            <span className="tag">未检测到查询参数</span>
          )}
        </div>
      </div>
      <p className="tool-note">参数值通常使用 encodeURIComponent；完整 URL 通常使用 encodeURI，以保留协议、路径和分隔符。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
