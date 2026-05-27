"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseEnv(input: string) {
  return Object.fromEntries(
    input.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");

        if (index === -1) {
          return [line, ""];
        }

        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");

        return [key, value];
      })
  );
}

function toExport(record: Record<string, string>) {
  return Object.entries(record).map(([key, value]) => `export ${key}=${JSON.stringify(value)}`).join("\n");
}

function toExample(record: Record<string, string>) {
  return Object.keys(record).map((key) => `${key}=`).join("\n");
}

export default function EnvParserTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("API_URL=https://api.example.com\nNODE_ENV=development\nFEATURE_FLAG=true");
  const [mode, setMode] = useState<"json" | "export" | "example">("json");
  const record = parseEnv(input);
  const output = mode === "json"
    ? JSON.stringify(record, null, 2)
    : mode === "export"
      ? toExport(record)
      : toExample(record);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Config Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>输出模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as "json" | "export" | "example")}>
            <option value="json">JSON</option>
            <option value="export">Shell export</option>
            <option value="example">.env.example</option>
          </select>
        </label>
        <button type="button" onClick={() => void copyOutput()}>复制输出</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>.env</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
