"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseCsvRecords(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
    } else if (character === "\"") {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";

      if (character === "\r" && next === "\n") {
        index += 1;
      }
    } else {
      current += character;
    }
  }

  if (inQuotes) {
    throw new Error("CSV 引号未闭合");
  }

  if (current !== "" || row.length > 0 || input.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function csvToJson(input: string) {
  const records = parseCsvRecords(input).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (records.length === 0) {
    return "[]";
  }

  const headers = records[0] ?? [];
  const rows = records.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));

  return JSON.stringify(rows, null, 2);
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  return /[",\n\r]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
}

function jsonToCsv(input: string) {
  const parsed = JSON.parse(input) as Array<Record<string, unknown>>;

  if (!Array.isArray(parsed)) {
    throw new Error("JSON 必须是对象数组");
  }

  const headers = Array.from(new Set(parsed.flatMap((row) => Object.keys(row))));
  const rows = parsed.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","));

  return [headers.join(","), ...rows].join("\n");
}

function getCsvStats(input: string) {
  try {
    const rows = parseCsvRecords(input).filter((row) => row.some((cell) => cell.trim() !== ""));
    return {
      rows: Math.max(0, rows.length - 1),
      columns: rows[0]?.length ?? 0
    };
  } catch {
    return {
      rows: 0,
      columns: 0
    };
  }
}

export default function CsvJsonConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("name,category,runtime\nJSON Formatter,developer,simple\nText Inspector,text,worker");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const stats = useMemo(() => getCsvStats(input), [input]);

  function run(action: "csvToJson" | "jsonToCsv") {
    try {
      setOutput(action === "csvToJson" ? csvToJson(input) : jsonToCsv(input));
      setError("");
      setCopied(false);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "转换失败");
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据转换</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => run("csvToJson")}>
          CSV 转 JSON
        </button>
        <button type="button" onClick={() => run("jsonToCsv")}>
          JSON 转 CSV
        </button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制输出" : "复制输出"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>CSV 数据行</h3>
          <p>{stats.rows}</p>
        </article>
        <article className="detail-card">
          <h3>CSV 列</h3>
          <p>{stats.columns}</p>
        </article>
        <article className="detail-card">
          <h3>输出字符</h3>
          <p>{output.length}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">CSV 转 JSON 会把第一行作为字段名；JSON 转 CSV 需要输入对象数组，嵌套对象会按 JavaScript 字符串形式输出。</p>
    </section>
  );
}
