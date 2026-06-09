"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function parseVars(input: string) {
  return Object.fromEntries(input.split(/\r?\n/).map((line) => line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.*)$/)).filter((match): match is RegExpMatchArray => Boolean(match)).map((match) => [match[1], match[2]]));
}

export default function PromptTemplateBuilderTool({ manifest }: ToolAppProps) {
  const [template, setTemplate] = useState("You are a {{role}}. Summarize {{topic}} for {{audience}} in {{tone}} tone.\nConstraints:\n- Output {{format}}\n- Keep it under {{limit}} words");
  const [vars, setVars] = useState("role=senior engineer\ntopic=tool platform optimization\naudience=product team\ntone=direct\nformat=bullet points\nlimit=120");
  const preview = useMemo(() => {
    const values = parseVars(vars);
    const missing = [...template.matchAll(/{{\s*([A-Za-z0-9_-]+)\s*}}/g)].map((match) => match[1]).filter((key) => values[key] == null);
    return { text: template.replace(/{{\s*([A-Za-z0-9_-]+)\s*}}/g, (_, key: string) => values[key] ?? `{{${key}}}`), missing: [...new Set(missing)] };
  }, [template, vars]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Prompt Ops</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="detail-grid"><article className="detail-card"><h3>模板变量</h3><p>{(template.match(/{{/g) ?? []).length}</p></article><article className="detail-card"><h3>缺失变量</h3><p>{preview.missing.length}</p></article></div>
      <div className="workspace workspace--two-column"><div><label className="tool-field"><span>Prompt 模板</span><textarea value={template} onChange={(event) => setTemplate(event.target.value)} rows={10} /></label><label className="tool-field"><span>变量，每行 key=value</span><textarea value={vars} onChange={(event) => setVars(event.target.value)} rows={8} /></label></div><label className="tool-field"><span>输出预览</span><textarea value={preview.text} readOnly rows={20} /></label></div>
      {preview.missing.length ? <p className="tool-error">缺失变量：{preview.missing.join(", ")}</p> : null}
    </section>
  );
}
