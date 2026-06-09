"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Mode = "csvToJson" | "jsonToCsv";
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
function escapeCsv(value: unknown, delimiter: string) {
  const text = value == null ? "" : String(value);
  return text.includes(delimiter) || text.includes('"') || text.includes("\n") ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function CsvJsonConverterTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<Mode>("csvToJson");
  const [delimiter, setDelimiter] = useState(",");
  const [pretty, setPretty] = useState(true);
  const [input, setInput] = useState("name,role,active\nAda,Engineer,true\nLinus,Reviewer,false");
  const result = useMemo(() => {
    try {
      if (mode === "csvToJson") {
        const rows = parseCsv(input, delimiter || ",");
        const headers = rows[0] ?? [];
        const data = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
        return { output: JSON.stringify(data, null, pretty ? 2 : 0), error: "", rows: data.length };
      }
      const data = JSON.parse(input) as Record<string, unknown>[];
      const rows = Array.isArray(data) ? data : [data];
      const headers = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))];
      const lines = [headers.join(delimiter || ","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header], delimiter || ",")).join(delimiter || ","))];
      return { output: lines.join("\n"), error: "", rows: rows.length };
    } catch (error) {
      return { output: "", error: error instanceof Error ? error.message : "转换失败", rows: 0 };
    }
  }, [delimiter, input, mode, pretty]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Structured Data</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>方向</span><select value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="csvToJson">CSV 转 JSON</option><option value="jsonToCsv">JSON 转 CSV</option></select></label><label className="tool-field tool-field--compact"><span>分隔符</span><input value={delimiter} maxLength={1} onChange={(event) => setDelimiter(event.target.value)} /></label><label className="tool-check"><input type="checkbox" checked={pretty} onChange={(event) => setPretty(event.target.checked)} /><span>格式化 JSON</span></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>记录数</h3><p>{result.rows}</p></article><article className="detail-card"><h3>状态</h3><p>{result.error ? "失败" : "成功"}</p></article></div>
      {result.error ? <p className="tool-error">{result.error}</p> : null}
      <div className="workspace workspace--two-column"><label className="tool-field"><span>输入</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={12} spellCheck={false} /></label><label className="tool-field"><span>输出</span><textarea value={result.output} readOnly rows={12} spellCheck={false} /></label></div>
    </section>
  );
}
