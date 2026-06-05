"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleJson = JSON.stringify({
  store: {
    books: [
      { title: "Book A", price: 12.99, authors: ["Alice"] },
      { title: "Book B", price: 8.99, authors: ["Bob", "Charlie"] },
      { title: "Book C", price: 15.99, authors: ["Alice", "Dave"] }
    ],
    address: { street: "123 Main St", city: "Springfield" }
  },
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 }
  ]
}, null, 2);

const samplePath = "$.store.books[?(@.price > 10)].title";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function queryJsonPath(obj: JsonValue, path: string): { result: JsonValue; error?: string } {
  try {
    const tokens = path.replace(/^\$/, "").split(/(?=\.|\[)/);
    let current: JsonValue[] = [obj];
    for (const token of tokens) {
      if (!token) continue;
      const next: JsonValue[] = [];
      if (token.startsWith(".")) {
        const key = token.slice(1);
        for (const item of current) {
          if (item && typeof item === "object" && !Array.isArray(item) && key in item)
            next.push((item as Record<string, JsonValue>)[key]);
        }
      } else if (token.startsWith("[?")) {
        const expr = token.slice(2, -2);
        const [field, op, val] = expr.split(/([<>!=]+)/).map(s => s.trim());
        for (const item of current) {
          if (Array.isArray(item)) {
            for (const el of item) {
              if (el && typeof el === "object") {
                const v = (el as Record<string, JsonValue>)[field];
                const match = op === ">" ? Number(v) > Number(val) :
                  op === "<" ? Number(v) < Number(val) :
                  op === ">=" ? Number(v) >= Number(val) :
                  op === "<=" ? Number(v) <= Number(val) :
                  op === "==" || op === "===" ? v === val :
                  String(v) === val;
                if (match) next.push(el);
              }
            }
          }
        }
      } else if (token.startsWith("[")) {
        const idx = parseInt(token.slice(1, -1));
        for (const item of current) {
          if (Array.isArray(item) && item[idx] !== undefined) next.push(item[idx]);
        }
      }
      current = next;
      if (current.length === 0) return { result: null };
    }
    return { result: current.length === 1 ? current[0] : current };
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.message : "查询失败" };
  }
}

export default function JsonpathTesterTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [json, setJson] = useState(sampleJson);
  const [path, setPath] = useState(samplePath);
  const [copied, setCopied] = useState(false);
  let parsed: JsonValue | null = null;
  let parseError = "";
  try { parsed = JSON.parse(json); } catch (e) { parseError = "JSON 解析错误"; }
  const queryResult = useMemo(() => {
    if (!parsed) return null;
    return queryJsonPath(parsed, path);
  }, [json, path, parsed]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>JSONPath</span>
          <input value={path} onChange={e => setPath(e.target.value)} placeholder="$.store.books[0].title" />
        </label>
        <button type="button" onClick={async () => { await sdk.copy(JSON.stringify(queryResult?.result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={json} onChange={e => setJson(e.target.value)} spellCheck={false} rows={16} />
        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card"><h3>匹配数</h3><p>{Array.isArray(queryResult?.result) ? queryResult.result.length : queryResult?.result !== null ? 1 : 0}</p></article>
            <article className="detail-card"><h3>状态</h3><p>{queryResult?.error ? "错误" : "成功"}</p></article>
          </div>
          <label className="tool-field">
            <span>查询结果</span>
            <textarea className="code-input" value={JSON.stringify(queryResult?.result, null, 2) || ""} readOnly spellCheck={false} rows={12} />
          </label>
          {queryResult?.error ? <p className="tool-error">{queryResult.error}</p> : null}
          {parseError ? <p className="tool-error">{parseError}</p> : null}
        </div>
      </div>
      <p className="tool-note">支持 JSONPath 点号语法、数组索引 `[n]` 和过滤表达式 `[?(@.price &gt; 10)]`。</p>
    </section>
  );
}
