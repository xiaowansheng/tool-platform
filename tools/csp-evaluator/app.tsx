"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function parseCsp(input: string) {
  return Object.fromEntries(input.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name ?? "", values];
  }));
}
function evaluate(input: string) {
  const directives = parseCsp(input);
  const issues: string[] = [];
  const script = directives["script-src"] ?? directives["default-src"] ?? [];
  if (!directives["default-src"]) issues.push("缺少 default-src，未覆盖的资源类型会更宽松。");
  if (script.includes("'unsafe-inline'")) issues.push("script-src 包含 unsafe-inline，XSS 风险较高。");
  if (script.includes("'unsafe-eval'")) issues.push("script-src 包含 unsafe-eval，可能允许动态代码执行。");
  if (Object.values(directives).some((values) => values.includes("*"))) issues.push("存在通配符 *，建议收敛到明确域名。");
  if (!directives["object-src"]) issues.push("建议设置 object-src 'none'。");
  if (!directives["base-uri"]) issues.push("建议设置 base-uri 'self'。");
  if (!directives["frame-ancestors"]) issues.push("建议设置 frame-ancestors 防止点击劫持。");
  return { directives, issues, score: Math.max(0, 100 - issues.length * 14) };
}

export default function CspEvaluatorTool({ manifest }: ToolAppProps) {
  const [policy, setPolicy] = useState("default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data:");
  const result = useMemo(() => evaluate(policy), [policy]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Security Headers</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <label className="tool-field"><span>Content-Security-Policy</span><textarea value={policy} onChange={(event) => setPolicy(event.target.value)} rows={7} spellCheck={false} /></label>
      <div className="detail-grid"><article className="detail-card"><h3>安全评分</h3><p>{result.score}/100</p></article><article className="detail-card"><h3>Directives</h3><p>{Object.keys(result.directives).length}</p></article><article className="detail-card"><h3>风险项</h3><p>{result.issues.length}</p></article></div>
      <label className="tool-field"><span>评估结果</span><textarea value={result.issues.length ? result.issues.join("\n") : "未发现明显高风险配置。"} readOnly rows={8} /></label>
    </section>
  );
}
