"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Fn = "SUM" | "AVERAGE" | "COUNT" | "MIN" | "MAX" | "IF" | "CONCAT" | "XLOOKUP";
function quote(value: string) { return /^-?\d+(?:\.\d+)?$/.test(value) || /^[A-Z]+\d+(?::[A-Z]+\d+)?$/i.test(value) ? value : `"${value.replaceAll('"', '""')}"`; }
function calc(fn: Fn, args: string[]) {
  const nums = args.map(Number).filter(Number.isFinite);
  if (fn === "SUM") return nums.reduce((sum, item) => sum + item, 0).toString();
  if (fn === "AVERAGE") return nums.length ? (nums.reduce((sum, item) => sum + item, 0) / nums.length).toFixed(2) : "";
  if (fn === "COUNT") return String(nums.length);
  if (fn === "MIN") return nums.length ? String(Math.min(...nums)) : "";
  if (fn === "MAX") return nums.length ? String(Math.max(...nums)) : "";
  return "预览仅生成公式，不执行表格引用。";
}

export default function ExcelFormulaBuilderTool({ manifest }: ToolAppProps) {
  const [fn, setFn] = useState<Fn>("SUM");
  const [args, setArgs] = useState("A1:A10, 20, 30");
  const [separator, setSeparator] = useState(",");
  const parts = useMemo(() => args.split(separator).map((item) => item.trim()).filter(Boolean), [args, separator]);
  const formula = `=${fn}(${parts.map(quote).join(", ")})`;
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Spreadsheet</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>函数</span><select value={fn} onChange={(event) => setFn(event.target.value as Fn)}>{["SUM", "AVERAGE", "COUNT", "MIN", "MAX", "IF", "CONCAT", "XLOOKUP"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="tool-field tool-field--compact"><span>参数分隔符</span><input value={separator} maxLength={1} onChange={(event) => setSeparator(event.target.value || ",")} /></label></div>
      <label className="tool-field"><span>参数</span><textarea value={args} onChange={(event) => setArgs(event.target.value)} rows={5} /></label>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>公式</span><textarea value={formula} readOnly rows={5} /></label><label className="tool-field"><span>本地预览</span><textarea value={calc(fn, parts)} readOnly rows={5} /></label></div>
    </section>
  );
}
