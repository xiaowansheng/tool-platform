"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleJson = `{
  // 这是支持注释的 JSON
  "platform": "tool-platform",
  "mode": "workspace",
  "features": ["format", "minify", "validate"],
  "config": {
    "indent": 2,
    "theme": "dark",
  } // 支持尾随逗号
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

// Loose JSON and JS Literal Object auto-repair function
function tryRepairJson(input: string): string {
  const cleanInput = input.trim();
  if (!cleanInput) return "";

  // 1. Strip comments (single-line // and multi-line /* */)
  let cleaned = cleanInput.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

  // 2. Safe client-side evaluation of JS literal / loose JSON structure
  try {
    const fn = new Function(`return (${cleaned});`);
    const evaluated = fn();
    if (evaluated !== null && typeof evaluated === "object") {
      return JSON.stringify(evaluated, null, 2);
    }
  } catch {
    // Fail-through to regex cleaning if Function execution fails
  }

  // 3. Fallback: manual regex fixes for typical loose syntax
  let fixed = cleaned;
  // Replace single quotes with double quotes around keys/values
  // (We use a very basic regex cleanup as last resort)
  fixed = fixed
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"') // Convert single quotes to double
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
    .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas

  try {
    const parsed = JSON.parse(fixed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    throw new Error("JSON 结构严重损坏，自动修复引擎无法提取对象。请确认括号是否闭合配对。");
  }
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
      // Direct parse
      return { data: JSON.parse(input), error: null };
    } catch (parseError) {
      // Try to silently evaluate as loose JSON
      try {
        let cleaned = input.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        const fn = new Function(`return (${cleaned});`);
        const evaluated = fn();
        if (evaluated !== null && typeof evaluated === "object") {
          return { data: evaluated, error: null };
        }
      } catch {
        // Fall through to error
      }
      return { data: null, error: parseError instanceof Error ? parseError.message : "JSON 解析失败" };
    }
  }, [input]);

  useEffect(() => {
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
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
    status: error ? "格式有误" : "正常",
  }), [input, output, error]);

  // Clean JSON compression
  function compressJson() {
    if (parsed.error) {
      setError("压缩前请先修复语法错误");
      return;
    }
    try {
      const compressed = JSON.stringify(parsed.data, sortKeys ? sortKeysFn : undefined, 0);
      setOutput(compressed);
      setError("");
      setCopied("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "压缩错误");
    }
  }

  // Trigger manual repair
  function handleAutoRepair() {
    try {
      const repaired = tryRepairJson(input);
      setInput(repaired);
      setError("");
      setCopied("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "修复失败");
    }
  }

  async function handleCopy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("复制失败，请检查浏览器权限");
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
          <p className="eyebrow">数据清洗与格式化</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "提供标准 JSON 的格式化与压缩，以及智能宽松 JSON/JS 对象的自动修复功能，支持以树状视图展开浏览。"}</p>
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
        <button type="button" onClick={compressJson}>压缩 (Minify)</button>
        <button type="button" className={sortKeys ? "button--primary" : ""} onClick={() => setSortKeys(!sortKeys)}>
          {sortKeys ? "按键排序中" : "字典序排序"}
        </button>
        <button type="button" className="button--primary" onClick={handleAutoRepair}>
          🔧 一键修复宽松/JS对象
        </button>
        <button type="button" onClick={() => void handleCopy("output", output)} disabled={!output}>
          {copied === "output" ? "已复制" : "复制输出"}
        </button>
        <button type="button" onClick={handleReset}>重置示例</button>
        <button type="button" onClick={() => { setInput(""); setOutput(""); setError(""); setCopied(""); setShowTree(false); }}>清空</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JSON 输入 (支持带注释、尾随逗号、单引号等非标 JS 对象字面量)</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setCopied(""); setShowTree(false); }}
            spellCheck={false}
            rows={16}
            style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.825rem", lineHeight: 1.4 }}
          />
        </label>
        <label className="tool-field">
          <span>
            输出结果 ({showTree ? "树形可视化视图" : "格式化 JSON 文本"})
            {parsed.data && !parsed.error ? (
              <button
                type="button"
                className={showTree ? "button--primary" : "button-link button-link--accent"}
                style={{ marginLeft: 8 }}
                onClick={() => setShowTree(!showTree)}
              >
                {showTree ? "切换为文本视图" : "切换为树形视图"}
              </button>
            ) : null}
          </span>
          {showTree && parsed.data ? (
            <div className="mono-output" style={{ padding: "0.75rem", fontSize: "0.875rem", lineHeight: 1.8, overflow: "auto", maxHeight: 400, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)" }}>
              <JsonTreeView data={parsed.data} />
            </div>
          ) : (
            <textarea 
              value={output} 
              readOnly 
              spellCheck={false} 
              rows={16}
              style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.825rem", lineHeight: 1.4, background: "var(--bg-muted)" }}
            />
          )}
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字符数</h3>
          <p>{stats.inputChars.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>输入大小</h3>
          <p>{stats.inputBytes.toLocaleString()} B</p>
        </article>
        <article className="detail-card">
          <h3>输出大小</h3>
          <p>{stats.outputBytes.toLocaleString()} B</p>
        </article>
        <article className="detail-card">
          <h3>输出总行数</h3>
          <p>{stats.outputLines}</p>
        </article>
        <article className="detail-card">
          <h3>状态</h3>
          <p style={{ fontWeight: "600", color: error ? "#ef4444" : "#22c55e" }}>{stats.status}</p>
        </article>
      </div>

      {parsedErr ? (
        <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid #ef4444", borderRadius: "var(--radius-md)", padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <span style={{ fontSize: "0.825rem", color: "#ef4444" }}>
            ⚠️ {parsedErr.message} {parsedErr.line > 0 ? `(第 ${parsedErr.line} 行，第 ${parsedErr.column} 列)` : ""}
          </span>
          <button type="button" onClick={handleAutoRepair} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            尝试一键自动修复
          </button>
        </div>
      ) : null}

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：格式化引擎完全在本地浏览器沙箱运行；支持宽松 JSON 和 Javascript 对象转换，当检测到语法问题时会主动显示“一键自动修复”按钮。
      </p>
    </section>
  );
}
