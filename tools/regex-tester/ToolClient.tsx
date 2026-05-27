"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function RegexTesterTool({ manifest }: ToolClientProps) {
  const [pattern, setPattern] = useState("\\btool\\b");
  const [flags, setFlags] = useState("gi");
  const [content, setContent] = useState("Tool Platform lets tool builders ship simple tools first.");

  let error = "";
  let matches: string[] = [];

  try {
    const normalizedFlags = flags.includes("g") ? flags : `${flags}g`;
    const expression = new RegExp(pattern, normalizedFlags);
    matches = Array.from(content.matchAll(expression)).map((match) => match[0]);
  } catch (regexError) {
    error = regexError instanceof Error ? regexError.message : "表达式无效";
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Developer Workspace</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="workspace workspace--stack">
        <div className="tool-toolbar tool-toolbar--grid">
          <label className="tool-field tool-field--compact">
            <span>Pattern</span>
            <input value={pattern} onChange={(event) => setPattern(event.target.value)} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>Flags</span>
            <input value={flags} onChange={(event) => setFlags(event.target.value)} />
          </label>
        </div>
        <label className="tool-field">
          <span>测试文本</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} />
        </label>
        <div className="tool-results">
          <div>
            <p className="eyebrow">Matches</p>
            <strong>{matches.length}</strong>
          </div>
          <div>
            <p className="eyebrow">Preview</p>
            <p>{matches.join(", ") || "没有匹配结果"}</p>
          </div>
        </div>
        {error ? <p className="tool-error">{error}</p> : null}
      </div>
    </section>
  );
}
