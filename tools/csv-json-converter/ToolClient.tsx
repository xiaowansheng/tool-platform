"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
    } else if (character === "\"") {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current);
  return cells;
}

function csvToJson(input: string) {
  const lines = input.trim().split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    return "[]";
  }

  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);

    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

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
