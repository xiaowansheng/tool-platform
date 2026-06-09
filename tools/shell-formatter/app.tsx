"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function formatShell(input: string, indentSize: number) {
  const issues: string[] = [];
  let indent = 0;
  const lines = input.split(/\r?\n/).map((raw, index) => {
    const line = raw.trim();
    if (!line) return "";
    if (/^(fi|done|esac|\})\b/.test(line)) indent = Math.max(0, indent - 1);
    if (/\$[A-Za-z_][A-Za-z0-9_]*(?![A-Za-z0-9_"}])/.test(line) && !line.includes("local ")) issues.push(`第 ${index + 1} 行可能存在未加引号变量`);
    const output = `${" ".repeat(indent * indentSize)}${line}`;
    if (/\b(then|do)$/.test(line) || /\b(case)\b.*\bin\b$/.test(line) || line.endsWith("{") || (/^(if|for|while|until)\b/.test(line) && !/\b(then|do)\b/.test(line))) indent += 1;
    if (/^(else|elif)\b/.test(line)) indent += 1;
    return output;
  });
  return { output: lines.join("\n"), issues };
}

export default function ShellFormatterTool({ manifest }: ToolAppProps) {
  const [script, setScript] = useState("if [ -f package.json ]; then\necho $PWD\nfor file in *.ts; do\necho \"$file\"\ndone\nfi");
  const [indentSize, setIndentSize] = useState(2);
  const result = useMemo(() => formatShell(script, indentSize), [indentSize, script]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Shell</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>缩进空格</span><input type="number" min="2" max="8" value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))} /></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>行数</h3><p>{script.split(/\r?\n/).length}</p></article><article className="detail-card"><h3>Lint 提示</h3><p>{result.issues.length}</p></article></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>Shell 输入</span><textarea value={script} onChange={(event) => setScript(event.target.value)} rows={14} spellCheck={false} /></label><label className="tool-field"><span>格式化输出</span><textarea value={result.output} readOnly rows={14} spellCheck={false} /></label></div>
      {result.issues.length ? <p className="tool-error">{result.issues.slice(0, 3).join("；")}</p> : <p className="tool-note">轻量格式化器，适合快速整理脚本草稿；生产脚本建议继续使用 shfmt/shellcheck。</p>}
    </section>
  );
}
