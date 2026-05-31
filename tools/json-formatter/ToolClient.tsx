"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const sampleJson = `{
  "platform": "tool-platform",
  "mode": "workspace",
  "features": ["format", "minify", "validate"]
}`;

function tryFormatJson(input: string, indent: number) {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

export default function JsonFormatterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleJson);
  const [indent, setIndent] = useState("2");
  const [output, setOutput] = useState(sampleJson);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    return {
      inputChars: input.length,
      outputLines: output ? output.split("\n").length : 0,
      status: error ? "需要修正" : output ? "可使用" : "等待输入"
    };
  }, [error, input, output]);

  function handleFormat() {
    try {
      const formatted = tryFormatJson(input, Number(indent));
      setOutput(formatted);
      setError("");
      setCopied(false);
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "JSON 无法解析");
    }
  }

  function handleMinify() {
    try {
      const formatted = tryFormatJson(input, 0);
      setOutput(formatted);
      setError("");
      setCopied(false);
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "JSON 无法解析");
    }
  }

  async function copyOutput() {
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
          <p className="eyebrow">数据整理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>缩进宽度</span>
          <select value={indent} onChange={(event) => setIndent(event.target.value)}>
            <option value="2">2 空格</option>
            <option value="4">4 空格</option>
            <option value="8">8 空格</option>
          </select>
        </label>
        <button type="button" onClick={handleFormat}>
          格式化
        </button>
        <button type="button" onClick={handleMinify}>
          压缩
        </button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制" : "复制输出"}
        </button>
        <button type="button" onClick={() => { setInput(sampleJson); setOutput(sampleJson); setError(""); setCopied(false); }}>
          填入示例
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JSON 输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>处理结果</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字符</h3>
          <p>{stats.inputChars}</p>
        </article>
        <article className="detail-card">
          <h3>输出行数</h3>
          <p>{stats.outputLines}</p>
        </article>
        <article className="detail-card">
          <h3>状态</h3>
          <p>{stats.status}</p>
        </article>
      </div>
      <p className="tool-note">适合整理接口响应、配置文件和日志中的 JSON 片段。所有处理都在当前浏览器本地完成。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
