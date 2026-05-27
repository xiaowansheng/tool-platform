"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function createSlug(value: string, separator: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");
}

export default function SlugGeneratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Tool Platform: Build useful browser tools fast");
  const [separator, setSeparator] = useState("-");
  const [copied, setCopied] = useState(false);
  const output = createSlug(input, separator);

  async function handleCopy() {
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
        <label className="tool-field tool-field--compact">
          <span>分隔符</span>
          <select value={separator} onChange={(event) => setSeparator(event.target.value)}>
            <option value="-">hyphen</option>
            <option value="_">underscore</option>
          </select>
        </label>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Slug</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
