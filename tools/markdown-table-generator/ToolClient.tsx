"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseRows(input: string) {
  const delimiter = input.includes("\t") ? "\t" : ",";
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
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      row.push(cell.trim());
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
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => value !== ""));
}

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function toMarkdownTable(input: string) {
  const rows = parseRows(input);

  if (rows.length === 0) {
    return "";
  }

  const columns = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: columns }, (_, index) => escapeCell(row[index] ?? "")));
  const header = normalized[0] ?? [];
  const separator = Array.from({ length: columns }, () => "---");
  const body = normalized.slice(1);

  return [header, separator, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

export default function MarkdownTableGeneratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Tool,Category,Runtime\nJSON Formatter,Developer,Simple\nText Inspector,Text,Worker");
  const output = toMarkdownTable(input);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Markdown Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyOutput()}>复制表格</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>CSV / TSV</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Markdown</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
