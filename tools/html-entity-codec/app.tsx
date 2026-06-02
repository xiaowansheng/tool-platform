"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const defaultInput = "<button aria-label=\"Save & close\">保存</button>";

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

export default function HtmlEntityCodecTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState(() => encodeEntities(defaultInput));
  const [copied, setCopied] = useState(false);

  function handleEncode() {
    setOutput(encodeEntities(input));
    setCopied(false);
  }

  function handleDecode() {
    setOutput(decodeEntities(input));
    setCopied(false);
  }

  function handleSwap() {
    if (!output) return;
    setInput(output);
    setOutput(input);
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
          <p className="eyebrow">HTML 文本处理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleEncode}>
          编码为实体
        </button>
        <button type="button" onClick={handleDecode}>
          解码为文本
        </button>
        <button type="button" onClick={handleSwap} disabled={!output}>
          输入/输出互换
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制输出"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">编码会处理 &、&lt;、&gt;、双引号和单引号；如果要做完整 HTML 清洗，请再配合专门的 sanitizer。</p>
    </section>
  );
}
