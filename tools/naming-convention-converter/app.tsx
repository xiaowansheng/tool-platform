"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function words(value: string) {
  return value.trim().replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean).map((word) => word.toLowerCase());
}
function cap(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function conversions(value: string) {
  const parts = words(value);
  return [
    ["camelCase", parts.map((part, index) => index ? cap(part) : part).join("")],
    ["PascalCase", parts.map(cap).join("")],
    ["snake_case", parts.join("_")],
    ["CONSTANT_CASE", parts.join("_").toUpperCase()],
    ["kebab-case", parts.join("-")],
    ["dot.case", parts.join(".")],
    ["Title Case", parts.map(cap).join(" ")],
    ["Sentence case", parts.length ? `${cap(parts[0] ?? "")} ${parts.slice(1).join(" ")}`.trim() : ""]
  ];
}

export default function NamingConventionConverterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("dailyStandupGenerator tool_name");
  const [copied, setCopied] = useState("");
  async function copy(label: string, value: string) { await navigator.clipboard.writeText(value); setCopied(label); }
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Naming</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <label className="tool-field"><span>输入名称</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={4} spellCheck={false} /></label>
      <div className="case-grid">
        {conversions(input).map(([label, value]) => <article className="detail-card" key={label}><div className="tool-card__header"><h3>{label}</h3><button type="button" onClick={() => void copy(label, value)} disabled={!value}>{copied === label ? "已复制" : "复制"}</button></div><p className="mono-output">{value || "待输入"}</p></article>)}
      </div>
    </section>
  );
}
