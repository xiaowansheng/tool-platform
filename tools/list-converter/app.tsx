"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type SortOrder = "none" | "asc" | "desc" | "natural";

const sortLabels: Record<SortOrder, string> = {
  none: "不排序",
  asc: "升序",
  desc: "降序",
  natural: "自然排序"
};

const separatorLabels: Record<string, string> = {
  "\\n": "换行",
  ",": "逗号",
  ";": "分号",
  "\\t": "Tab",
  " ": "空格"
};

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function ListConverterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("banana\napple\ncherry\napple\ndate\nbanana\nelderberry");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [deduplicate, setDeduplicate] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [trimItems, setTrimItems] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [lowercase, setLowercase] = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [inputSeparator, setInputSeparator] = useState("\\n");
  const [outputSeparator, setOutputSeparator] = useState("\\n");
  const [truncateLength, setTruncateLength] = useState(0);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const sep = inputSeparator === "\\n" ? "\n" : inputSeparator === "\\t" ? "\t" : inputSeparator;
    let items = input.split(sep);

    if (trimItems) items = items.map((s) => s.trim());
    if (removeEmpty) items = items.filter((s) => s.length > 0);
    if (deduplicate) items = [...new Set(items)];

    switch (sortOrder) {
      case "asc": items.sort(); break;
      case "desc": items.sort().reverse(); break;
      case "natural": items.sort(naturalCompare); break;
    }

    if (reverse) items.reverse();
    if (lowercase) items = items.map((s) => s.toLowerCase());
    if (uppercase) items = items.map((s) => s.toUpperCase());
    if (truncateLength > 0) items = items.map((s) => s.slice(0, truncateLength));
    if (prefix || suffix) items = items.map((s) => prefix + s + suffix);

    const outSep = outputSeparator === "\\n" ? "\n" : outputSeparator === "\\t" ? "\t" : outputSeparator;
    return items.join(outSep);
  }, [input, prefix, suffix, sortOrder, deduplicate, reverse, trimItems, removeEmpty, lowercase, uppercase, truncateLength, inputSeparator, outputSeparator]);

  const inputLines = input.split(inputSeparator === "\\n" ? "\n" : inputSeparator === "\\t" ? "\t" : inputSeparator).filter(Boolean);
  const outputLines = result.split(outputSeparator === "\\n" ? "\n" : outputSeparator === "\\t" ? "\t" : outputSeparator).filter(Boolean);

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">列表处理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>输入分隔符</span>
          <select value={inputSeparator} onChange={(e) => setInputSeparator(e.target.value)}>
            {Object.entries(separatorLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出分隔符</span>
          <select value={outputSeparator} onChange={(e) => setOutputSeparator(e.target.value)}>
            {Object.entries(separatorLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>排序</span>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
            {Object.entries(sortLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>截断长度 (0=不截断)</span>
          <input
            type="number"
            min={0}
            value={truncateLength}
            onChange={(e) => setTruncateLength(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="tool-toolbar tool-toolbar--grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        <label className="tool-field tool-field--compact">
          <span>前缀</span>
          <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="无" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>后缀</span>
          <input type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="无" />
        </label>
      </div>

      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={trimItems} onChange={(e) => setTrimItems(e.target.checked)} />
          <span>去除空白</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={removeEmpty} onChange={(e) => setRemoveEmpty(e.target.checked)} />
          <span>移除空行</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={deduplicate} onChange={(e) => setDeduplicate(e.target.checked)} />
          <span>去重</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
          <span>反序</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={lowercase} onChange={(e) => { setLowercase(e.target.checked); if (e.target.checked) setUppercase(false); }} />
          <span>小写</span>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={uppercase} onChange={(e) => { setUppercase(e.target.checked); if (e.target.checked) setLowercase(false); }} />
          <span>大写</span>
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入 ({inputLines.length} 项)</span>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} rows={8} />
        </label>
        <label className="tool-field">
          <span>输出 ({outputLines.length} 项)</span>
          <textarea value={result} readOnly spellCheck={false} rows={8} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      <p className="tool-note">
        所有操作实时预览。自然排序可正确处理包含数字的字符串（如 file2 排在 file10 之前）。
      </p>
    </section>
  );
}
