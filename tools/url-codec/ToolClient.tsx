"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseQuery(input: string) {
  const query = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
  const params = new URLSearchParams(query);

  return Array.from(params.entries());
}

export default function UrlCodecTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("https://example.com/search?q=tool platform&runtime=worker");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"component" | "full">("component");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  const queryEntries = parseQuery(input);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Network Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as "component" | "full")}>
            <option value="component">URL component</option>
            <option value="full">Full URL</option>
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
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} onChange={(event) => setOutput(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="detail-card">
        <h3>Query Params</h3>
        <div className="tag-list">
          {queryEntries.length > 0 ? (
            queryEntries.map(([key, value]) => (
              <span key={`${key}-${value}`} className="tag">
                {key}: {value}
              </span>
            ))
          ) : (
            <span className="tag">no query params</span>
          )}
        </div>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
