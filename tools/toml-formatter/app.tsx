"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function formatToml(input: string, sortKeys: boolean) {
  const issues: string[] = [];
  const sections: string[][] = [[]];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^\[[^\]]+\]$/.test(line)) sections.push([line]);
    else if (line.includes("=")) sections[sections.length - 1]?.push(line.replace(/\s*=\s*/, " = "));
    else issues.push(`无法识别: ${line}`);
  }
  const output = sections.map((section) => {
    if (!sortKeys || section.length <= 2) return section.join("\n");
    const [head, ...rest] = section[0]?.startsWith("[") ? section : ["", ...section];
    return [head, ...rest.sort((a, b) => a.localeCompare(b))].filter(Boolean).join("\n");
  }).filter(Boolean).join("\n\n");
  return { output, issues };
}

export default function TomlFormatterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("title=\"Tool Platform\"\n[server]\nport=3000\nenabled=true");
  const [sortKeys, setSortKeys] = useState(false);
  const result = useMemo(() => formatToml(input, sortKeys), [input, sortKeys]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Config</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-option-list"><label className="tool-check"><input type="checkbox" checked={sortKeys} onChange={(event) => setSortKeys(event.target.checked)} /><span>分组内按键名排序</span></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>诊断</h3><p>{result.issues.length}</p></article><article className="detail-card"><h3>输出字符</h3><p>{result.output.length}</p></article></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>TOML 输入</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={12} spellCheck={false} /></label><label className="tool-field"><span>格式化结果</span><textarea value={result.output} readOnly rows={12} spellCheck={false} /></label></div>
      {result.issues.length ? <p className="tool-error">{result.issues.join("; ")}</p> : <p className="tool-note">支持常见 TOML 键值和 section 的轻量格式化；复杂多行字符串建议再用专业解析器复核。</p>}
    </section>
  );
}
