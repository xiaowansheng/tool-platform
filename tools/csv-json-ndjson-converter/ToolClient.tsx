"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type DataFormat = "csv" | "json" | "ndjson";

const sampleCsv = `id,name,active,score
1,Ada,true,93
2,Grace,true,88
3,Linus,false,76`;

function parseCsvLine(line: string, delimiter = ",") {
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
    } else if (character === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current);
  return cells;
}

function parseCsv(input: string) {
  const lines = input.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header, index) => header.trim() || `column_${index + 1}`);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);

    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function normalizeJsonInput(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return item as Record<string, unknown>;
      }

      return { index, value: item };
    });
  }

  if (value && typeof value === "object") {
    return [value as Record<string, unknown>];
  }

  return [{ value }];
}

function parseNdjson(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown)
    .flatMap((item, index) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return [item as Record<string, unknown>];
      }

      return [{ index, value: item }];
    });
}

function escapeCsvCell(value: unknown) {
  const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const body = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","));

  return [headers.join(","), ...body].join("\n");
}

function convert(input: string, from: DataFormat, to: DataFormat) {
  const rows = from === "csv"
    ? parseCsv(input)
    : from === "json"
      ? normalizeJsonInput(JSON.parse(input))
      : parseNdjson(input);

  if (to === "csv") {
    return toCsv(rows);
  }

  if (to === "ndjson") {
    return rows.map((row) => JSON.stringify(row)).join("\n");
  }

  return JSON.stringify(rows, null, 2);
}

export default function CsvJsonNdjsonConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleCsv);
  const [output, setOutput] = useState("");
  const [from, setFrom] = useState<DataFormat>("csv");
  const [to, setTo] = useState<DataFormat>("json");
  const [error, setError] = useState("");

  function run() {
    try {
      setOutput(convert(input, from, to));
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
          <p className="eyebrow">Data Conversion</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>输入格式</span>
          <select value={from} onChange={(event) => setFrom(event.target.value as DataFormat)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="ndjson">NDJSON</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={to} onChange={(event) => setTo(event.target.value as DataFormat)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="ndjson">NDJSON</option>
          </select>
        </label>
        <button type="button" onClick={run}>
          转换
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
