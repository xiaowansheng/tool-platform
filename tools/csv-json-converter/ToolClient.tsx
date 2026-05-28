"use client";

import { useState } from "react";

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

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
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

export default function CsvJsonConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("name,category,runtime\nJSON Formatter,developer,simple\nText Inspector,text,worker");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function run(action: "csvToJson" | "jsonToCsv") {
    try {
      setOutput(action === "csvToJson" ? csvToJson(input) : jsonToCsv(input));
      setError("");
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "转换失败");
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Data Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => run("csvToJson")}>
          CSV → JSON
        </button>
        <button type="button" onClick={() => run("jsonToCsv")}>
          JSON → CSV
        </button>
        <button type="button" onClick={() => void copyOutput()}>
          复制输出
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
