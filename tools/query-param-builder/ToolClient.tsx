"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

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

export default function QueryParamBuilderTool({ manifest }: ToolClientProps) {
  const [base, setBase] = useState("https://example.com/search");
  const [rows, setRows] = useState<ParamRow[]>([
    { id: 1, key: "q", value: "tool platform" },
    { id: 2, key: "page", value: "1" }
  ]);
  const [inputUrl, setInputUrl] = useState("https://example.com/search?q=tool%20platform&page=1");
  const [error, setError] = useState("");

  let output = "";
  let outputError = "";

  try {
    output = buildUrl(base, rows);
  } catch (buildError) {
    outputError = buildError instanceof Error ? buildError.message : "URL 生成失败";
  }

  function updateRow(id: number, field: "key" | "value", value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function handleParse() {
    try {
      const parsed = parseUrl(inputUrl);
      setBase(parsed.base);
      setRows(parsed.rows.length > 0 ? parsed.rows : [{ id: 1, key: "", value: "" }]);
      setError("");
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "URL 解析失败");
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

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
          <span>Parse URL</span>
          <input value={inputUrl} onChange={(event) => setInputUrl(event.target.value)} />
        </label>
        <button type="button" onClick={handleParse}>解析</button>
        <button type="button" onClick={() => void copyOutput()}>复制结果</button>
      </div>
      <label className="tool-field">
        <span>Base URL</span>
        <input value={base} onChange={(event) => setBase(event.target.value)} />
      </label>
      <div className="workspace workspace--stack">
        {rows.map((row) => (
          <div key={row.id} className="param-row">
            <input value={row.key} onChange={(event) => updateRow(row.id, "key", event.target.value)} placeholder="key" />
            <input value={row.value} onChange={(event) => updateRow(row.id, "value", event.target.value)} placeholder="value" />
            <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="tool-toolbar">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { id: Date.now(), key: "", value: "" }])}
        >
          添加参数
        </button>
      </div>
      <label className="tool-field">
        <span>输出</span>
        <textarea value={output} readOnly spellCheck={false} />
      </label>
      {error || outputError ? <p className="tool-error">{error || outputError}</p> : null}
    </section>
  );
}
