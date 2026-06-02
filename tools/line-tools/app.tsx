"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Action = "trim" | "removeEmpty" | "sortAsc" | "sortDesc" | "unique" | "reverse";

const actionLabels: Record<Action, string> = {
  trim: "修剪空白",
  removeEmpty: "去空行",
  sortAsc: "升序排序",
  sortDesc: "降序排序",
  unique: "去重",
  reverse: "反转"
};

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

function countLines(value: string) {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}

export default function LineToolsTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("alpha\nbeta\n\nalpha\ngamma\n beta ");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastAction, setLastAction] = useState<Action | null>(null);

  function run(action: Action) {
    setOutput(transformLines(input, action));
    setLastAction(action);
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
          <p className="eyebrow">行文本处理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => run("trim")}>修剪空白</button>
        <button type="button" onClick={() => run("removeEmpty")}>去空行</button>
        <button type="button" onClick={() => run("sortAsc")}>升序</button>
        <button type="button" onClick={() => run("sortDesc")}>降序</button>
        <button type="button" onClick={() => run("unique")}>去重</button>
        <button type="button" onClick={() => run("reverse")}>反转</button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>{copied ? "已复制" : "复制输出"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入行</h3>
          <p>{countLines(input)}</p>
        </article>
        <article className="detail-card">
          <h3>输出行</h3>
          <p>{countLines(output)}</p>
        </article>
        <article className="detail-card">
          <h3>最近操作</h3>
          <p>{lastAction ? actionLabels[lastAction] : "未执行"}</p>
        </article>
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
      <p className="tool-note">去重按整行文本精确匹配；如果要忽略前后空格，请先执行修剪空白再执行去重。</p>
    </section>
  );
}
