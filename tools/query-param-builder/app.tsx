"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const TABS = ["Query Params", "Encode / Decode"] as const;

function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64Utf8(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const urlEncodings = [
  { label: "encodeURIComponent", encode: encodeURIComponent, decode: decodeURIComponent },
  { label: "encodeURI", encode: encodeURI, decode: decodeURI },
  { label: "base64 (UTF-8)", encode: encodeBase64Utf8, decode: decodeBase64Utf8 },
];

interface ParamRow {
  id: number;
  key: string;
  value: string;
}

function parseUrl(input: string) {
  const url = new URL(input);

  return {
    base: `${url.origin}${url.pathname}`,
    rows: Array.from(url.searchParams.entries()).map(([key, value], index) => ({ id: index + 1, key, value }))
  };
}

function buildUrl(base: string, rows: ParamRow[]) {
  const url = new URL(base);
  url.search = "";

  for (const row of rows) {
    if (row.key.trim()) {
      url.searchParams.append(row.key.trim(), row.value);
    }
  }

  return url.toString();
}

export default function QueryParamBuilderTool({ manifest }: ToolAppProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Query Params");
  const [base, setBase] = useState("https://example.com/search");
  const [rows, setRows] = useState<ParamRow[]>([
    { id: 1, key: "q", value: "工具平台" },
    { id: 2, key: "page", value: "1" }
  ]);
  const [inputUrl, setInputUrl] = useState("https://example.com/search?q=%E5%B7%A5%E5%85%B7%E5%B9%B3%E5%8F%B0&page=1");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [encodeInput, setEncodeInput] = useState("Hello World 你好 / ? & =");
  const [encodeMethod, setEncodeMethod] = useState(0);
  const [encodeDir, setEncodeDir] = useState<"encode" | "decode">("encode");

  let output = "";
  let outputError = "";

  try {
    output = buildUrl(base, rows);
  } catch (buildError) {
    outputError = buildError instanceof Error ? buildError.message : "URL 生成失败";
  }

  function updateRow(id: number, field: "key" | "value", value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setCopied(false);
  }

  function handleParse() {
    try {
      const parsed = parseUrl(inputUrl);
      setBase(parsed.base);
      setRows(parsed.rows.length > 0 ? parsed.rows : [{ id: 1, key: "", value: "" }]);
      setError("");
      setCopied(false);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "URL 解析失败，请输入包含协议的完整 URL");
    }
  }

  async function copyOutput() {
    if (!output || outputError) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  function addParam() {
    setRows((current) => [...current, { id: Date.now(), key: "", value: "" }]);
    setCopied(false);
  }

  const encodedOutput = useMemo(() => {
    try {
      const method = urlEncodings[encodeMethod]!;
      return encodeDir === "encode" ? method.encode(encodeInput) : method.decode(encodeInput);
    } catch {
      return "编码/解码失败";
    }
  }, [encodeInput, encodeMethod, encodeDir]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">链接参数</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? "tool-toolbar__btn tool-toolbar__btn--active" : "tool-toolbar__btn"} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Query Params" ? (
        <>
          <div className="tool-toolbar">
            <label className="tool-field tool-field--compact">
              <span>待解析 URL</span>
              <input value={inputUrl} onChange={(event) => setInputUrl(event.target.value)} />
            </label>
            <button type="button" onClick={handleParse}>解析参数</button>
            <button type="button" onClick={() => void copyOutput()} disabled={!output || Boolean(outputError)}>
              {copied ? "已复制" : "复制结果"}
            </button>
          </div>
          <label className="tool-field">
            <span>基础 URL</span>
            <input value={base} onChange={(event) => { setBase(event.target.value); setCopied(false); }} />
          </label>
          <div className="workspace workspace--stack">
            {rows.map((row) => (
              <div key={row.id} className="param-row">
                <input value={row.key} onChange={(event) => updateRow(row.id, "key", event.target.value)} placeholder="参数名" />
                <input value={row.value} onChange={(event) => updateRow(row.id, "value", event.target.value)} placeholder="参数值" />
                <button type="button" onClick={() => { setRows((current) => current.filter((item) => item.id !== row.id)); setCopied(false); }}>
                  删除
                </button>
              </div>
            ))}
          </div>
          <div className="tool-toolbar">
            <button type="button" onClick={addParam}>
              添加参数
            </button>
          </div>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>参数数量</h3>
              <p>{rows.filter((row) => row.key.trim()).length}</p>
            </article>
            <article className="detail-card">
              <h3>生成状态</h3>
              <p>{outputError ? "待修正" : "可复制"}</p>
            </article>
          </div>
          <label className="tool-field">
            <span>生成 URL</span>
            <textarea value={output} readOnly spellCheck={false} />
          </label>
          <p className="tool-note">适合编辑 UTM、分页、筛选条件和回调地址参数；参数值会按 URLSearchParams 规则自动编码。</p>
        </>
      ) : (
        <>
          <div className="tool-toolbar">
            {urlEncodings.map((enc, i) => (
              <button key={enc.label} type="button" className={encodeMethod === i ? "tool-toolbar__btn tool-toolbar__btn--active" : "tool-toolbar__btn"} onClick={() => setEncodeMethod(i)}>{enc.label}</button>
            ))}
            <button type="button" className={encodeDir === "encode" ? "tool-toolbar__btn tool-toolbar__btn--active" : "tool-toolbar__btn"} onClick={() => setEncodeDir("encode")}>编码</button>
            <button type="button" className={encodeDir === "decode" ? "tool-toolbar__btn tool-toolbar__btn--active" : "tool-toolbar__btn"} onClick={() => setEncodeDir("decode")}>解码</button>
          </div>
          <label className="tool-field">
            <span>输入</span>
            <textarea value={encodeInput} onChange={(event) => setEncodeInput(event.target.value)} />
          </label>
          <label className="tool-field">
            <span>输出</span>
            <textarea value={encodedOutput} readOnly spellCheck={false} />
          </label>
        </>
      )}
      {error || outputError ? <p className="tool-error">{error || outputError}</p> : null}
    </section>
  );
}
