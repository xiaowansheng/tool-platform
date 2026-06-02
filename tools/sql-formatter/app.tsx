"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const breakKeywords = [
  "select", "from", "where", "group by", "order by", "having", "limit",
  "inner join", "left join", "right join", "join", "union", "values", "set"
];

function formatSql(input: string) {
  let output = input.replace(/\s+/g, " ").trim();

  for (const keyword of breakKeywords) {
    output = output.replace(new RegExp("\\b" + keyword + "\\b", "gi"), (match) => "\n" + match.toUpperCase());
  }

  return output
    .replace(/,\s*/g, ",\n  ")
    .replace(/\(\s*/g, "(\n  ")
    .replace(/\s*\)/g, "\n)")
    .trim();
}

function minifySql(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export default function SqlFormatterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("select id, name, created_at from users where active = true order by created_at desc limit 20");
  const [output, setOutput] = useState(() => formatSql("select id, name, created_at from users where active = true order by created_at desc limit 20"));
  const [copied, setCopied] = useState(false);
  const outputLines = output ? output.split(/\r?\n/).length : 0;

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  function run(action: "format" | "minify") {
    setOutput(action === "format" ? formatSql(input) : minifySql(input));
    setCopied(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据库调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => run("format")}>格式化</button>
        <button type="button" onClick={() => run("minify")}>压缩</button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>{copied ? "已复制输出" : "复制输出"}</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字符</h3>
          <p>{input.length}</p>
        </article>
        <article className="detail-card">
          <h3>输出行</h3>
          <p>{outputLines}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SQL 输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>格式化输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">这是轻量 SQL 排版工具，适合快速阅读常见查询；复杂方言、存储过程或嵌套表达式仍建议用项目指定格式化器复核。</p>
    </section>
  );
}
