"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function utf8Hex(character: string) {
  return Array.from(new TextEncoder().encode(character), (byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

function getCharacterLabel(character: string) {
  if (character === " ") return "空格";
  if (character === "\t") return "制表符";
  if (character === "\n") return "换行";
  if (character === "\r") return "回车";
  if (character === "\u00a0") return "不间断空格";

  return character;
}

export default function UnicodeInspectorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("Tool ✨ 平台");
  const characters = Array.from(input);
  const byteCount = new TextEncoder().encode(input).length;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">字符编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>字符数</h3>
          <p>{characters.length}</p>
        </article>
        <article className="detail-card">
          <h3>UTF-8 字节</h3>
          <p>{byteCount}</p>
        </article>
      </div>
      <label className="tool-field">
        <span>文本</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="tool-table unicode-table">
        <div className="tool-table__row tool-table__row--head unicode-table__row">
          <span>字符</span>
          <span>Code Point</span>
          <span>UTF-8 字节</span>
        </div>
        {characters.length > 0 ? characters.map((character, index) => {
          const codePoint = character.codePointAt(0) ?? 0;

          return (
            <div key={character + "-" + index} className="tool-table__row unicode-table__row">
              <span>{getCharacterLabel(character)}</span>
              <span>U+{codePoint.toString(16).toUpperCase().padStart(4, "0")}</span>
              <span className="mono-output">{utf8Hex(character)}</span>
            </div>
          );
        }) : (
          <div className="tool-table__row unicode-table__row">
            <span>暂无字符</span>
            <span>-</span>
            <span>-</span>
          </div>
        )}
      </div>
      <p className="tool-note">字符数按 Unicode code point 统计，组合字符和肤色修饰符可能仍由多个 code point 组成。</p>
    </section>
  );
}
