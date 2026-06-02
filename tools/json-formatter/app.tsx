"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleJson = `{
  "platform": "tool-platform",
  "mode": "workspace",
  "features": ["format", "minify", "validate"],
  "config": {
    "indent": 2,
    "theme": "dark"
  }
}`;

function sortKeysFn(_key: string, value: unknown) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = value[k as keyof typeof value];
        return acc;
      }, {});
  }
  return value;
}

function getByteSize(str: string) {
  return new Blob([str]).size;
}

function parseErrorPosition(message: string, input: string) {
  const posMatch = message.match(/position\s+(\d+)/i);
  if (!posMatch) return { message, line: 0, column: 0 };
  const pos = Number.parseInt(posMatch[1]!, 10);
  const before = input.slice(0, pos);
  const line = (before.match(/\n/g) || []).length + 1;
  const lastNewline = before.lastIndexOf("\n");
  const column = pos - lastNewline;
  return { message, line, column };
}

function JsonTreeView({
  data,
  depth = 0,
}: {
  data: unknown;
  depth?: number;
}) {
  const type = data === null ? "null" : (Array.isArray(data) ? "array" : typeof data);
  const isCollapsible = type === "object" || type === "array";

  if (!isCollapsible) {
    const displayValue = type === "string" ? `"${data as string}"` : String(data);
    return <span className="mono-output">{displayValue}</span>;
  }

  const entries = Object.entries(data as Record<string, unknown>);
  const label = type === "array" ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <details open={depth < 2} style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <summary className="mono-output" style={{ cursor: "pointer" }}>{label}</summary>
      {entries.map(([key, val]) => (
        <div key={key} style={{ paddingLeft: 16 }}>
          <span className="mono-output" style={{ color: "var(--accent-primary)" }}>{key}</span>
          <span className="mono-output">: </span>
          <JsonTreeView data={val} depth={depth + 1} />
        </div>
      ))}
    </details>
  );
}

export default function JsonFormatterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleJson);
  const [indent, setIndent] = useState("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState(sampleJson);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [showTree, setShowTree] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const parsed = useMemo(() => {
    try {
      return { data: JSON.parse(input), error: null };
    } catch (parseError) {
      return { data: null, error: parseError instanceof Error ? parseError.message : "JSON 解析失败" };
    }
  }, [input]);

  useEffect(() => {
    if (parsed.error) return;
    try {
      const formatted = JSON.stringify(parsed.data, sortKeys ? sortKeysFn : undefined, Number(indent));
      setOutput(formatted);
      setError("");
    } catch {
      setError("格式化失败");
    }
  }, [input, indent, sortKeys, parsed]);

  const stats = useMemo(() => ({
    inputChars: input.length,
    inputBytes: getByteSize(input),
    outputChars: output.length,
    outputBytes: getByteSize(output),
    outputLines: output ? output.split("\n").length : 0,
    status: error ? "需要修正" : "可使用",
  }), [input, output, error]);

  function format(indentNum: number) {
    try {
      const p = JSON.parse(input);
      const formatted = JSON.stringify(p, sortKeys ? sortKeysFn : undefined, indentNum);
      setOutput(formatted);
      setError("");
      setCopied("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON 无法解析");
    }
  }

  async function handleCopy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
  }

  async function handlePaste() {
    try {
      setInput(await navigator.clipboard.readText());
      setCopied("");
    } catch {
      setError("无法读取剪贴板，请检查权限");
    }
  }

  function handleReset() {
    setInput(sampleJson);
    setOutput(sampleJson);
    setError("");
    setCopied("");
    setShowTree(false);
  }

  const parsedErr = useMemo(() => {
    if (!error) return null;
    return parseErrorPosition(error, input);
  }, [error, input]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据整理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>缩进</span>
          <select value={indent} onChange={(e) => setIndent(e.target.value)}>
            <option value="2">2 空格</option>
            <option value="4">4 空格</option>
            <option value="8">8 空格</option>
          </select>
        </label>
        <button type="button" onClick={() => format(0)}>压缩</button>
        <button type="button" className={sortKeys ? "button--primary" : ""} onClick={() => setSortKeys(!sortKeys)}>
          {sortKeys ? "排序中" : "排序键"}
        </button>
        <button type="button" onClick={() => void handleCopy("output", output)} disabled={!output}>
          {copied === "output" ? "已复制" : "复制输出"}
        </button>
        <button type="button" onClick={handleReset}>重置示例</button>
        <button type="button" onClick={() => { setInput(""); setOutput(""); setError(""); setCopied(""); setShowTree(false); }}>清空</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>
            JSON 输入
            <button type="button" className="button--primary" style={{ marginLeft: 8 }} onClick={() => format(Number(indent))}>格式化</button>
          </span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setCopied(""); setShowTree(false); }}
            spellCheck={false}
            rows={16}
          />
        </label>
        <label className="tool-field">
          <span>
            处理结果
            {parsed.data && !parsed.error ? (
              <button
                type="button"
                className={showTree ? "button--primary" : "button-link button-link--accent"}
                style={{ marginLeft: 8 }}
                onClick={() => setShowTree(!showTree)}
              >
                {showTree ? "文本视图" : "树形视图"}
              </button>
            ) : null}
          </span>
          {showTree && parsed.data ? (
            <div className="mono-output" style={{ padding: "0.75rem", fontSize: "0.875rem", lineHeight: 1.8, overflow: "auto", maxHeight: 400 }}>
              <JsonTreeView data={parsed.data} />
            </div>
          ) : (
            <textarea value={output} readOnly spellCheck={false} rows={16} />
          )}
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字符</h3>
          <p>{stats.inputChars.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>输入大小</h3>
          <p>{stats.inputBytes.toLocaleString()} B</p>
        </article>
        <article className="detail-card">
          <h3>输出字符</h3>
          <p>{stats.outputChars.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>输出大小</h3>
          <p>{stats.outputBytes.toLocaleString()} B</p>
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

      {parsedErr ? (
        <p className="tool-error">
          {parsedErr.message}
          {parsedErr.line > 0 ? `（第 ${parsedErr.line} 行，第 ${parsedErr.column} 列）` : ""}
        </p>
      ) : null}

      <p className="tool-note">
        适合整理接口响应、配置文件和日志中的 JSON 片段，
        输入即自动格式化。支持排序键和树形浏览。
      </p>
    </section>
  );
}
