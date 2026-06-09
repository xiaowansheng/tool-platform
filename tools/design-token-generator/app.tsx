"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function extract(input: string) {
  const vars = [...input.matchAll(/--([A-Za-z0-9-_]+)\s*:\s*([^;]+);?/g)].map((match) => ({ name: match[1] ?? "token", value: match[2]?.trim() ?? "" }));
  const colors = [...input.matchAll(/#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi)].map((match, index) => ({ name: `color-${index + 1}`, value: match[0] }));
  const spacing = [...input.matchAll(/\b\d+(?:\.\d+)?(?:px|rem|em)\b/g)].map((match, index) => ({ name: `space-${index + 1}`, value: match[0] }));
  const tokens = [...vars, ...colors, ...spacing].filter((item, index, arr) => arr.findIndex((other) => other.name === item.name && other.value === item.value) === index);
  return tokens;
}

export default function DesignTokenGeneratorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(":root {\n  --color-primary: #0d9488;\n  --space-md: 1rem;\n  --radius-card: 12px;\n}\n.button { color: #ffffff; padding: 12px; }");
  const tokens = useMemo(() => extract(input), [input]);
  const json = JSON.stringify(Object.fromEntries(tokens.map((token) => [slug(token.name), { value: token.value }])), null, 2);
  const css = `:root {\n${tokens.map((token) => `  --${slug(token.name)}: ${token.value};`).join("\n")}\n}`;
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Design System</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="detail-grid"><article className="detail-card"><h3>Token 数</h3><p>{tokens.length}</p></article><article className="detail-card"><h3>颜色</h3><p>{tokens.filter((token) => token.value.startsWith("#")).length}</p></article></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>CSS / Token 文本</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={14} /></label><div><label className="tool-field"><span>JSON Tokens</span><textarea value={json} readOnly rows={8} /></label><label className="tool-field"><span>CSS Variables</span><textarea value={css} readOnly rows={8} /></label></div></div>
    </section>
  );
}
