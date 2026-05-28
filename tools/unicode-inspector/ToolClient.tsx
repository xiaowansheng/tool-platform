"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function utf8Hex(character: string) {
  return Array.from(new TextEncoder().encode(character), (byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

export default function UnicodeInspectorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Tool ✨ 平台");
  const characters = Array.from(input);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Text Analysis</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>文本</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>字符</span>
          <span>Code point</span>
          <span>UTF-8</span>
        </div>
        {characters.map((character, index) => {
          const codePoint = character.codePointAt(0) ?? 0;

          return (
            <div key={`${character}-${index}`} className="tool-table__row">
              <span>{character === " " ? "space" : character}</span>
              <span>U+{codePoint.toString(16).toUpperCase().padStart(4, "0")}</span>
              <span>{utf8Hex(character)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
