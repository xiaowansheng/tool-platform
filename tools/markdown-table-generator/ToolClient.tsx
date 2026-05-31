"use client";

import { useMemo, useState } from "react";

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

  if (inQuotes) {
    throw new Error("CSV / TSV 引号未闭合");
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

function buildMarkdownTable(input: string) {
  const rows = parseRows(input);

  if (rows.length === 0) {
    return {
      output: "",
      rows: 0,
      columns: 0,
      delimiter: input.includes("\t") ? "TSV" : "CSV"
    };
  }

  const columns = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: columns }, (_, index) => escapeCell(row[index] ?? "")));
  const header = normalized[0] ?? [];
  const separator = Array.from({ length: columns }, () => "---");
  const body = normalized.slice(1);

  return {
    output: [header, separator, ...body].map((row) => "| " + row.join(" | ") + " |").join("\n"),
    rows: Math.max(0, rows.length - 1),
    columns,
    delimiter: input.includes("\t") ? "TSV" : "CSV"
  };
}

export default function MarkdownTableGeneratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("工具,分类,运行方式\nJSON Formatter,开发工具,本地\nText Inspector,文本工具,Worker");
  const [copied, setCopied] = useState(false);
  const table = useMemo(() => {
    try {
      return { ...buildMarkdownTable(input), error: "" };
    } catch (buildError) {
      return {
        output: "",
        rows: 0,
        columns: 0,
        delimiter: input.includes("\t") ? "TSV" : "CSV",
        error: buildError instanceof Error ? buildError.message : "表格生成失败"
      };
    }
  }, [input]);

  async function copyOutput() {
    await navigator.clipboard.writeText(table.output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文档表格</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void copyOutput()} disabled={!table.output}>{copied ? "已复制表格" : "复制表格"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>数据行</h3>
          <p>{table.rows}</p>
        </article>
        <article className="detail-card">
          <h3>列数</h3>
          <p>{table.columns}</p>
        </article>
        <article className="detail-card">
          <h3>识别格式</h3>
          <p>{table.delimiter}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>CSV / TSV 输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Markdown 表格</span>
          <textarea value={table.output} readOnly spellCheck={false} />
        </label>
      </div>
      {table.error ? <p className="tool-error">{table.error}</p> : null}
      <p className="tool-note">第一行会作为表头；单元格里的竖线会自动转义，换行会转换为 &lt;br&gt;。</p>
    </section>
  );
}
