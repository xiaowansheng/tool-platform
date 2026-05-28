"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Action = "trim" | "removeEmpty" | "sortAsc" | "sortDesc" | "unique" | "reverse";

function transformLines(input: string, action: Action) {
  let lines = input.split(/\r?\n/);

  if (action === "trim") {
    lines = lines.map((line) => line.trim());
  }

  if (action === "removeEmpty") {
    lines = lines.filter((line) => line.trim() !== "");
  }

  if (action === "sortAsc") {
    lines = [...lines].sort((left, right) => left.localeCompare(right));
  }

  if (action === "sortDesc") {
    lines = [...lines].sort((left, right) => right.localeCompare(left));
  }

  if (action === "unique") {
    lines = Array.from(new Set(lines));
  }

  if (action === "reverse") {
    lines = [...lines].reverse();
  }

  return lines.join("\n");
}

export default function LineToolsTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("alpha\nbeta\n\nalpha\ngamma\n beta ");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function run(action: Action) {
    setOutput(transformLines(input, action));
    setCopied(false);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Text Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => run("trim")}>Trim</button>
        <button type="button" onClick={() => run("removeEmpty")}>去空行</button>
        <button type="button" onClick={() => run("sortAsc")}>升序</button>
        <button type="button" onClick={() => run("sortDesc")}>降序</button>
        <button type="button" onClick={() => run("unique")}>去重</button>
        <button type="button" onClick={() => run("reverse")}>反转</button>
        <button type="button" onClick={() => void copyOutput()}>{copied ? "已复制" : "复制"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
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
