"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type DelimiterKey = "comma" | "semicolon" | "tab";

interface CleanOptions {
  delimiter: string;
  hasHeader: boolean;
  trimCells: boolean;
  removeEmptyRows: boolean;
  dedupeRows: boolean;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  filterColumn: string;
  filterValue: string;
}

const delimiterMap: Record<DelimiterKey, string> = {
  comma: ",",
  semicolon: ";",
  tab: "\t"
};

const sampleCsv = `name,team,score,status
Ada,core,93,active
 Grace ,data,88,active
Ada,core,93,active
Linus,ops,76,paused
,,,
Margaret,data,99,active`;

function parseCsv(input: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (character === "\"") {
      inQuotes = !inQuotes;
    } else if (character === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";

      if (character === "\r" && next === "\n") {
        index += 1;
      }
    } else {
      cell += character;
    }
  }

  if (cell !== "" || row.length > 0 || input.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function escapeCsvCell(value: string, delimiter: string) {
  return value.includes(delimiter) || /["\r\n]/.test(value)
    ? `"${value.replace(/"/g, "\"\"")}"`
    : value;
}

function stringifyCsv(rows: string[][], delimiter: string) {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)).join("\n");
}

function columnIndexFromInput(columns: string[], input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return -1;
  }

  const byName = columns.findIndex((column) => column.toLowerCase() === trimmed.toLowerCase());

  if (byName >= 0) {
    return byName;
  }

  const byNumber = Number.parseInt(trimmed, 10);
  return Number.isFinite(byNumber) && byNumber > 0 ? byNumber - 1 : -1;
}

function cleanCsv(input: string, options: CleanOptions) {
  const parsed = parseCsv(input, options.delimiter);
  const maxColumns = Math.max(0, ...parsed.map((row) => row.length));
  const normalized = parsed.map((row) => Array.from({ length: maxColumns }, (_, index) => row[index] ?? ""));
  const header = options.hasHeader && normalized.length > 0
    ? normalized[0].map((cell, index) => {
        const value = options.trimCells ? cell.trim() : cell;
        return value || `Column ${index + 1}`;
      })
    : Array.from({ length: maxColumns }, (_, index) => `Column ${index + 1}`);
  const body = options.hasHeader ? normalized.slice(1) : normalized;

  let rows = options.trimCells
    ? body.map((row) => row.map((cell) => cell.trim()))
    : body.map((row) => [...row]);

  if (options.removeEmptyRows) {
    rows = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  }

  const filterColumnIndex = columnIndexFromInput(header, options.filterColumn);
  const filterNeedle = options.filterValue.trim().toLowerCase();

  if (filterColumnIndex >= 0 && filterNeedle) {
    rows = rows.filter((row) => (row[filterColumnIndex] ?? "").toLowerCase().includes(filterNeedle));
  }

  const beforeDedupe = rows.length;

  if (options.dedupeRows) {
    const seen = new Set<string>();
    rows = rows.filter((row) => {
      const key = JSON.stringify(row);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  const sortColumnIndex = columnIndexFromInput(header, options.sortColumn);

  if (sortColumnIndex >= 0) {
    rows = [...rows].sort((left, right) => {
      const direction = options.sortDirection === "asc" ? 1 : -1;
      const leftValue = left[sortColumnIndex] ?? "";
      const rightValue = right[sortColumnIndex] ?? "";
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);

      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return (leftNumber - rightNumber) * direction;
      }

      return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * direction;
    });
  }

  const outputRows = options.hasHeader ? [header, ...rows] : rows;

  return {
    columns: header,
    output: stringifyCsv(outputRows, options.delimiter),
    previewRows: outputRows.slice(0, 8),
    parsedRows: Math.max(0, parsed.length - (options.hasHeader ? 1 : 0)),
    outputRows: rows.length,
    removedRows: Math.max(0, body.length - rows.length),
    duplicatesRemoved: options.dedupeRows ? Math.max(0, beforeDedupe - rows.length) : 0
  };
}

export default function CsvCleanerTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleCsv);
  const [delimiterKey, setDelimiterKey] = useState<DelimiterKey>("comma");
  const [hasHeader, setHasHeader] = useState(true);
  const [trimCells, setTrimCells] = useState(true);
  const [removeEmptyRows, setRemoveEmptyRows] = useState(true);
  const [dedupeRows, setDedupeRows] = useState(true);
  const [sortColumn, setSortColumn] = useState("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterColumn, setFilterColumn] = useState("status");
  const [filterValue, setFilterValue] = useState("active");

  const result = useMemo(() => cleanCsv(input, {
    delimiter: delimiterMap[delimiterKey],
    hasHeader,
    trimCells,
    removeEmptyRows,
    dedupeRows,
    sortColumn,
    sortDirection,
    filterColumn,
    filterValue
  }), [dedupeRows, delimiterKey, filterColumn, filterValue, hasHeader, input, removeEmptyRows, sortColumn, sortDirection, trimCells]);

  async function copyOutput() {
    await navigator.clipboard.writeText(result.output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Data Cleaning</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>分隔符</span>
          <select value={delimiterKey} onChange={(event) => setDelimiterKey(event.target.value as DelimiterKey)}>
            <option value="comma">Comma</option>
            <option value="semicolon">Semicolon</option>
            <option value="tab">Tab</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>排序列</span>
          <input value={sortColumn} onChange={(event) => setSortColumn(event.target.value)} placeholder="列名或序号" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>方向</span>
          <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as "asc" | "desc")}>
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>筛选列</span>
          <input value={filterColumn} onChange={(event) => setFilterColumn(event.target.value)} placeholder="列名或序号" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>筛选值</span>
          <input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder="contains" />
        </label>
        <button type="button" onClick={() => void copyOutput()}>
          复制 CSV
        </button>
      </div>
      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={hasHeader} onChange={(event) => setHasHeader(event.target.checked)} />
          <span>首行表头</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={trimCells} onChange={(event) => setTrimCells(event.target.checked)} />
          <span>修剪单元格</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={removeEmptyRows} onChange={(event) => setRemoveEmptyRows(event.target.checked)} />
          <span>移除空行</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={dedupeRows} onChange={(event) => setDedupeRows(event.target.checked)} />
          <span>整行去重</span>
        </label>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>CSV 输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>清洗结果</span>
          <textarea value={result.output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>原始行数</h3>
          <p>{result.parsedRows}</p>
        </article>
        <article className="detail-card">
          <h3>输出行数</h3>
          <p>{result.outputRows}</p>
        </article>
        <article className="detail-card">
          <h3>移除行数</h3>
          <p>{result.removedRows}</p>
        </article>
        <article className="detail-card">
          <h3>重复行</h3>
          <p>{result.duplicatesRemoved}</p>
        </article>
      </div>
      <div className="tool-table">
        {result.previewRows.map((row, rowIndex) => (
          <div
            key={`${rowIndex}-${row.join("|")}`}
            className={`tool-table__row ${rowIndex === 0 && hasHeader ? "tool-table__row--head" : ""}`}
            style={{ gridTemplateColumns: `repeat(${Math.max(1, result.columns.length)}, minmax(7rem, 1fr))` }}
          >
            {row.map((cell, cellIndex) => (
              <span key={`${cellIndex}-${cell}`}>{cell || "empty"}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
