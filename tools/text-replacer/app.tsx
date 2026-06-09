"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Mode = "plain" | "regex";
type Transform = "none" | "lower" | "upper" | "title";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(value: string) {
  return value.replace(/\p{L}[\p{L}\p{N}'-]*/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function applyTransform(value: string, transform: Transform) {
  if (transform === "lower") return value.toLowerCase();
  if (transform === "upper") return value.toUpperCase();
  if (transform === "title") return titleCase(value);
  return value;
}

export default function TextReplacerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("foo=old\nbar=old\n# replace old values");
  const [find, setFind] = useState("old");
  const [replaceWith, setReplaceWith] = useState("new-{{index}}");
  const [mode, setMode] = useState<Mode>("plain");
  const [flags, setFlags] = useState("g");
  const [transform, setTransform] = useState<Transform>("none");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!find) return { output: applyTransform(input, transform), matches: 0, error: "" };

    try {
      const source = mode === "regex" ? find : escapeRegex(find);
      const normalizedFlags = flags.includes("g") ? flags : `${flags}g`;
      const regex = new RegExp(source, normalizedFlags);
      let index = 0;
      const output = input.replace(regex, (match) => {
        index += 1;
        return replaceWith
          .replaceAll("{{index}}", String(index))
          .replaceAll("{{match}}", match);
      });
      return { output: applyTransform(output, transform), matches: index, error: "" };
    } catch (error) {
      return { output: input, matches: 0, error: error instanceof Error ? error.message : "替换失败" };
    }
  }, [find, flags, input, mode, replaceWith, transform]);

  async function copyOutput() {
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Batch Text</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>查找</span><input value={find} onChange={(event) => { setFind(event.target.value); setCopied(false); }} /></label>
        <label className="tool-field tool-field--compact"><span>替换为</span><input value={replaceWith} onChange={(event) => { setReplaceWith(event.target.value); setCopied(false); }} /></label>
        <label className="tool-field tool-field--compact"><span>模式</span><select value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="plain">普通文本</option><option value="regex">正则表达式</option></select></label>
        <label className="tool-field tool-field--compact"><span>正则 flags</span><input value={flags} onChange={(event) => setFlags(event.target.value.replace(/[^dgimsuvy]/g, ""))} /></label>
        <label className="tool-field tool-field--compact"><span>大小写转换</span><select value={transform} onChange={(event) => setTransform(event.target.value as Transform)}><option value="none">不转换</option><option value="lower">全部小写</option><option value="upper">全部大写</option><option value="title">Title Case</option></select></label>
        <button type="button" className="button--primary" onClick={() => void copyOutput()}>{copied ? "已复制" : "复制结果"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>匹配次数</h3><p>{result.matches}</p></article>
        <article className="detail-card"><h3>字符变化</h3><p>{result.output.length - input.length}</p></article>
      </div>
      {result.error ? <p className="tool-error">{result.error}</p> : null}

      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>输入文本</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} rows={12} spellCheck={false} /></label>
        <label className="tool-field"><span>{"输出文本，支持 {{index}} / {{match}}"}</span><textarea value={result.output} readOnly rows={12} spellCheck={false} /></label>
      </div>
    </section>
  );
}
