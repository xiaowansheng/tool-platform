"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const breakKeywords = [
  "select", "from", "where", "group by", "order by", "having", "limit",
  "inner join", "left join", "right join", "join", "union", "values", "set"
];

function formatSql(input: string) {
  let output = input.replace(/\s+/g, " ").trim();

  for (const keyword of breakKeywords) {
    output = output.replace(new RegExp(`\\b${keyword}\\b`, "gi"), (match) => `\n${match.toUpperCase()}`);
  }

  return output
    .replace(/,\s*/g, ",\n  ")
    .replace(/\(\s*/g, "(\n  ")
    .replace(/\s*\)/g, "\n)")
    .trim();
}

function minifySql(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export default function SqlFormatterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("select id, name, created_at from users where active = true order by created_at desc limit 20");
  const [output, setOutput] = useState("");

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Database Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => setOutput(formatSql(input))}>格式化</button>
        <button type="button" onClick={() => setOutput(minifySql(input))}>压缩</button>
        <button type="button" onClick={() => void copyOutput()}>复制输出</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SQL</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} onChange={(event) => setOutput(event.target.value)} spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
