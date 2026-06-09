"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function analyzeFunction(name: string, body: string) {
  const branches = (body.match(/\b(if|for|while|case|catch|&&|\|\||\?)\b/g) ?? []).length;
  const nesting = Math.max(0, ...body.split(/\r?\n/).map((line) => (line.match(/^\s*/)?.[0].length ?? 0) / 2));
  return { name, complexity: 1 + branches, cognitive: 1 + branches + Math.floor(nesting), lines: body.split(/\r?\n/).length };
}
function analyze(code: string) {
  const matches = [...code.matchAll(/(?:function\s+([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g)];
  if (!matches.length) return [analyzeFunction("<file>", code)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? code.length;
    return analyzeFunction(match[1] ?? match[2] ?? `function_${index + 1}`, code.slice(start, end));
  });
}

export default function CodeComplexityAnalyzerTool({ manifest }: ToolAppProps) {
  const [code, setCode] = useState("function score(items) {\n  let total = 0;\n  for (const item of items) {\n    if (item.active && item.value > 10) total += item.value;\n    else if (item.pending) total += 1;\n  }\n  return total;\n}");
  const rows = useMemo(() => analyze(code), [code]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Code Metrics</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>代码</span><textarea value={code} onChange={(event) => setCode(event.target.value)} rows={16} spellCheck={false} /></label><div>{rows.map((row) => <article key={row.name} className="detail-card"><h3>{row.name}</h3><p>圈复杂度 {row.complexity}</p><p className="mono-output">认知复杂度 {row.cognitive}, {row.lines} lines</p></article>)}</div></div>
      <p className="tool-note">这是轻量静态估算，适合快速定位高分支函数；严肃质量门禁建议接入 ESLint/Sonar/CodeQL。</p>
    </section>
  );
}
