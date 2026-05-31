"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface RegexMatch {
  value: string;
  index: number;
  groups: string[];
}

function uniqueFlags(flags: string) {
  return Array.from(new Set(flags.split("")).values()).join("");
}

export default function RegexTesterTool({ manifest }: ToolClientProps) {
  const [pattern, setPattern] = useState("\\btool\\b");
  const [flags, setFlags] = useState("gi");
  const [content, setContent] = useState("Tool Platform lets tool builders ship simple tools first.");

  let error = "";
  let matches: RegexMatch[] = [];

  try {
    const normalizedFlags = uniqueFlags(flags.includes("g") ? flags : flags + "g");
    const expression = new RegExp(pattern, normalizedFlags);
    matches = Array.from(content.matchAll(expression)).slice(0, 200).map((match) => ({
      value: match[0],
      index: match.index ?? 0,
      groups: match.slice(1)
    }));
  } catch (regexError) {
    error = regexError instanceof Error ? regexError.message : "表达式无效";
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">匹配调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="workspace workspace--stack">
        <div className="tool-toolbar tool-toolbar--grid">
          <label className="tool-field tool-field--compact">
            <span>Pattern</span>
            <input value={pattern} onChange={(event) => setPattern(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>Flags</span>
            <input value={flags} onChange={(event) => setFlags(event.target.value)} spellCheck={false} />
          </label>
        </div>
        <label className="tool-field">
          <span>测试文本</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} />
        </label>
        <div className="detail-grid">
          <article className="detail-card">
            <h3>匹配数</h3>
            <p>{matches.length}</p>
          </article>
          <article className="detail-card">
            <h3>文本长度</h3>
            <p>{content.length}</p>
          </article>
          <article className="detail-card">
            <h3>状态</h3>
            <p>{error ? "错误" : "可用"}</p>
          </article>
        </div>
        <div className="tool-table regex-match-table">
          <div className="tool-table__row tool-table__row--head regex-match-table__row">
            <span>序号</span>
            <span>位置</span>
            <span>匹配内容</span>
          </div>
          {matches.length > 0 ? matches.map((match, index) => (
            <div key={index + "-" + match.index + "-" + match.value} className="tool-table__row regex-match-table__row">
              <span>{index + 1}</span>
              <span>{match.index}</span>
              <span className="mono-output">{match.value}{match.groups.length > 0 ? " | groups: " + match.groups.join(", ") : ""}</span>
            </div>
          )) : (
            <div className="tool-table__row regex-match-table__row">
              <span>-</span>
              <span>-</span>
              <span>{error ? "表达式需要修正" : "没有匹配结果"}</span>
            </div>
          )}
        </div>
        {error ? <p className="tool-error">{error}</p> : null}
      </div>
    </section>
  );
}
