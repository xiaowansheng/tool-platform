"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Row = Record<string, string | number | boolean | null>;
type Database = Record<string, Row[]>;

const initialDb: Database = {
  tools: [
    { id: 1, name: "JSON Formatter", runtime: "simple" },
    { id: 2, name: "Text Inspector", runtime: "worker" },
    { id: 3, name: "OpenAPI Workbench", runtime: "simple" }
  ]
};

function runSelect(sql: string, db: Database) {
  const match = sql.trim().match(/^select\s+(.+)\s+from\s+(\w+)(?:\s+where\s+(\w+)\s*=\s*['"]?([^'"]+)['"]?)?/i);
  if (!match) throw new Error("当前轻量执行器支持 SELECT columns FROM table [WHERE key = value]");

  const columns = (match[1] ?? "*").split(",").map((item) => item.trim());
  const table = match[2] ?? "";
  const whereKey = match[3];
  const whereValue = match[4];
  const rows = db[table];
  if (!rows) throw new Error(`Unknown table: ${table}`);

  return rows
    .filter((row) => whereKey ? String(row[whereKey]) === whereValue : true)
    .map((row) => columns[0] === "*" ? row : Object.fromEntries(columns.map((column) => [column, row[column] ?? null])));
}

export default function SqlPlaygroundTool({ manifest }: ToolClientProps) {
  const [sql, setSql] = useState("SELECT id, name, runtime FROM tools WHERE runtime = simple");
  const [result, setResult] = useState(JSON.stringify(initialDb.tools, null, 2));
  const [error, setError] = useState("");

  function execute() {
    try {
      setResult(JSON.stringify(runSelect(sql, initialDb), null, 2));
      setError("");
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : "SQL 执行失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Database Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={execute}>执行</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SQL</span>
          <textarea value={sql} onChange={(event) => setSql(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>结果</span>
          <textarea value={result} readOnly spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">当前版本是内置内存 SQL 子集。SQLite/WASM 可在后续把执行器替换为 wasm runtime，而无需改变工具入口。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
