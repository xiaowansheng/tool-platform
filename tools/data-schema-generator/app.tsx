"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function infer(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return { type: "array", items: infer(value[0] ?? null) };
  if (value && typeof value === "object") {
    const properties = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, infer(item)]));
    return { type: "object", properties, required: Object.keys(properties) };
  }
  if (value === null) return { type: "null" };
  return { type: typeof value };
}
function tsType(name: string, schema: Record<string, unknown>, level = 0): string {
  const pad = "  ".repeat(level);
  if (schema.type === "array") return `${tsType(name, schema.items as Record<string, unknown>, level)}[]`;
  if (schema.type === "object") {
    const props = Object.entries((schema.properties ?? {}) as Record<string, Record<string, unknown>>).map(([key, item]) => `${pad}  ${key}: ${tsType(key, item, level + 1)};`).join("\n");
    return level === 0 ? `interface ${name} {\n${props}\n}` : `{\n${props}\n${pad}}`;
  }
  if (schema.type === "integer") return "number";
  return String(schema.type ?? "unknown");
}
function zod(schema: Record<string, unknown>): string {
  if (schema.type === "array") return `z.array(${zod(schema.items as Record<string, unknown>)})`;
  if (schema.type === "object") return `z.object({ ${Object.entries((schema.properties ?? {}) as Record<string, Record<string, unknown>>).map(([key, item]) => `${key}: ${zod(item)}`).join(", ")} })`;
  return schema.type === "number" ? "z.number()" : schema.type === "boolean" ? "z.boolean()" : schema.type === "null" ? "z.null()" : "z.string()";
}

export default function DataSchemaGeneratorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState('{"name":"Ada","score":98,"active":true,"tags":["dev","review"]}');
  const result = useMemo(() => {
    try {
      const data = JSON.parse(input) as unknown;
      const schema = infer(Array.isArray(data) ? data[0] : data);
      return { json: JSON.stringify(schema, null, 2), ts: tsType("Generated", schema), zod: zod(schema), error: "" };
    } catch (error) {
      return { json: "", ts: "", zod: "", error: error instanceof Error ? error.message : "解析失败" };
    }
  }, [input]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Schema</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      {result.error ? <p className="tool-error">{result.error}</p> : null}
      <div className="workspace workspace--two-column"><label className="tool-field"><span>示例 JSON</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={16} spellCheck={false} /></label><div><label className="tool-field"><span>JSON Schema</span><textarea value={result.json} readOnly rows={8} /></label><label className="tool-field"><span>TypeScript</span><textarea value={result.ts} readOnly rows={6} /></label><label className="tool-field"><span>Zod</span><textarea value={result.zod} readOnly rows={3} /></label></div></div>
    </section>
  );
}
