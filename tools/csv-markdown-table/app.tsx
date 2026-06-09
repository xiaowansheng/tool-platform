"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Mode = "csvToMarkdown" | "markdownToCsv";
function parseCsv(input: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index += 1; row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field); rows.push(row);
  return rows.filter((item) => item.some((cell) => cell.trim()));
}
function escapeCell(value: string, delimiter: string) { return value.includes(delimiter) || value.includes('"') || value.includes("\n") ? `"${value.replaceAll('"', '""')}"` : value; }
function toMarkdown(row: string[]) { return `| ${row.join(" | ")} |`; }

export default function CsvMarkdownTableTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<Mode>("csvToMarkdown");
  const [delimiter, setDelimiter] = useState(",");
  const [align, setAlign] = useState("left");
  const [input, setInput] = useState("Name,Role,Score\nAda,Engineer,98\nLinus,Reviewer,91");
  const result = useMemo(() => {
    if (mode === "csvToMarkdown") {
      const rows = parseCsv(input, delimiter || ",");
      const width = Math.max(0, ...rows.map((row) => row.length));
      const normalized = rows.map((row) => Array.from({ length: width }, (_, index) => row[index]?.trim() ?? ""));
      const separator = Array.from({ length: width }, () => align === "center" ? ":---:" : align === "right" ? "---:" : ":---");
      return normalized.length ? [toMarkdown(normalized[0] ?? []), toMarkdown(separator), ...normalized.slice(1).map((row) => toMarkdown(row))].join("\n") : "";
    }
    const rows = input.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("|")).filter((_, index) => index !== 1).map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    return rows.map((row) => row.map((cell) => escapeCell(cell, delimiter || ",")).join(delimiter || ",")).join("\n");
  }, [align, delimiter, input, mode]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Tables</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>方向</span><select value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="csvToMarkdown">CSV 转 Markdown</option><option value="markdownToCsv">Markdown 转 CSV</option></select></label><label className="tool-field tool-field--compact"><span>分隔符</span><input value={delimiter} maxLength={1} onChange={(event) => setDelimiter(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>对齐</span><select value={align} onChange={(event) => setAlign(event.target.value)}><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>输入</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={12} spellCheck={false} /></label><label className="tool-field"><span>输出</span><textarea value={result} readOnly rows={12} spellCheck={false} /></label></div>
    </section>
  );
}
