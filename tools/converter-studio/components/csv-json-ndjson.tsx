"use client";

import { useMemo, useState, useEffect } from "react";

type DataFormat = "csv" | "json" | "ndjson";

interface ComponentProps {
  inputText: string;
  onChangeInputText: (text: string) => void;
}

function parseCsvRecords(input: string, delimiter = ",") {
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
    } else if (character === delimiter && !inQuotes) {
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

function parseCsv(input: string) {
  const records = parseCsvRecords(input).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (records.length === 0) {
    return [];
  }

  const headers = (records[0] ?? []).map((header, index) => header.trim() || `column_${index + 1}`);
  return records.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
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

function getCsvStats(input: string) {
  try {
    const rows = parseCsvRecords(input).filter((row) => row.some((cell) => cell.trim() !== ""));
    return {
      rows: Math.max(0, rows.length - 1),
      columns: rows[0]?.length ?? 0
    };
  } catch {
    return { rows: 0, columns: 0 };
  }
}

export default function CsvJsonNdjsonConverterTab({ inputText, onChangeInputText }: ComponentProps) {
  const [output, setOutput] = useState("");
  const [from, setFrom] = useState<DataFormat>("csv");
  const [to, setTo] = useState<DataFormat>("json");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const csvStats = useMemo(() => from === "csv" ? getCsvStats(inputText) : null, [from, inputText]);

  function run() {
    if (!inputText.trim()) {
      setOutput("");
      setError("");
      return;
    }
    try {
      setOutput(convert(inputText, from, to));
      setError("");
      setCopied(false);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "转换失败");
    }
  }

  useEffect(() => {
    run();
  }, [inputText, from, to]);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
        <button type="button" className="button--primary" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制" : "复制输出"}
        </button>
      </div>

      {csvStats && csvStats.columns > 0 ? (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>数据行</span>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{csvStats.rows}</div>
          </article>
          <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>列数</span>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{csvStats.columns}</div>
          </article>
          <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>输出字符</span>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{output.length}</div>
          </article>
        </div>
      ) : null}

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入数据</span>
          <textarea 
            value={inputText} 
            onChange={(event) => onChangeInputText(event.target.value)} 
            placeholder="请在此输入或粘贴 CSV / JSON / NDJSON 数据..."
            spellCheck={false} 
            style={{ minHeight: "350px", fontFamily: "monospace" }}
          />
        </label>
        <label className="tool-field">
          <span>输出数据</span>
          <textarea 
            value={output} 
            readOnly
            placeholder="转换后的数据将在此处显示..."
            spellCheck={false} 
            style={{ minHeight: "350px", fontFamily: "monospace", background: "var(--bg-muted)" }}
          />
        </label>
      </div>
      {error ? <p className="tool-error" style={{ color: "var(--danger, #ef4444)" }}>{error}</p> : null}
    </div>
  );
}
