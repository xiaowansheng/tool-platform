"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const entityMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

function encodeEntities(value: string) {
  return value.replace(/[&<>"']/g, (character) => entityMap[character] ?? character);
}

function decodeEntities(value: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;

  return textarea.value;
}

export default function HtmlEntityCodecTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("<button aria-label=\"Save & close\">Save</button>");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function handleEncode() {
    setOutput(encodeEntities(input));
    setCopied(false);
  }

  function handleDecode() {
    setOutput(decodeEntities(input));
    setCopied(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Developer Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={handleEncode}>
          编码
        </button>
        <button type="button" onClick={handleDecode}>
          解码
        </button>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制"}
        </button>
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
