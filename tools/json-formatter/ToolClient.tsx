"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function tryFormatJson(input: string, indent: number) {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

export default function JsonFormatterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState('{\n  "platform": "tool-platform",\n  "mode": "workspace"\n}');
  const [indent, setIndent] = useState("2");
  const [output, setOutput] = useState(input);
  const [error, setError] = useState("");

  function handleFormat() {
    try {
      const formatted = tryFormatJson(input, Number(indent));
      setOutput(formatted);
      setError("");
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "JSON 无法解析");
    }
  }

  function handleMinify() {
    try {
      const formatted = tryFormatJson(input, 0);
      setOutput(formatted);
      setError("");
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "JSON 无法解析");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Simple Runtime</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>缩进</span>
          <select value={indent} onChange={(event) => setIndent(event.target.value)}>
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="8">8 spaces</option>
          </select>
        </label>
        <button type="button" onClick={handleFormat}>
          格式化
        </button>
        <button type="button" onClick={handleMinify}>
          压缩
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
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
