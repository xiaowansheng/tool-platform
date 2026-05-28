"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface GraphqlType {
  name: string;
  fields: Array<{ name: string; type: string }>;
}

function parseSchema(schema: string): GraphqlType[] {
  return Array.from(schema.matchAll(/type\s+(\w+)\s*\{([^}]+)\}/g)).map((match) => ({
    name: match[1] ?? "Unknown",
    fields: (match[2] ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "", type = "String"] = line.split(":").map((part) => part.trim());
        return { name: name.replace(/\(.+\)/, ""), type };
      })
  }));
}

function buildQuery(type: GraphqlType) {
  const fields = type.fields.filter((field) => !/[A-Z]\w/.test(field.type.replace(/[[\]!]/g, ""))).map((field) => `    ${field.name}`);
  return `query ${type.name}Query {\n  ${type.name.charAt(0).toLowerCase()}${type.name.slice(1)} {\n${fields.join("\n") || "    id"}\n  }\n}`;
}

export default function GraphqlWorkbenchTool({ manifest }: ToolClientProps) {
  const [schema, setSchema] = useState("type Tool {\n  id: ID!\n  name: String!\n  runtime: String!\n}\n\ntype Query {\n  tool(id: ID!): Tool\n  tools: [Tool!]!\n}");
  const types = parseSchema(schema);
  const [selected, setSelected] = useState("Tool");
  const type = types.find((item) => item.name === selected) ?? types[0];
  const query = type ? buildQuery(type) : "";

  async function copyQuery() {
    await navigator.clipboard.writeText(query);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>Type</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {types.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void copyQuery()}>复制查询</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>GraphQL SDL</span>
          <textarea value={schema} onChange={(event) => setSchema(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Query Draft</span>
          <textarea value={query} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        {types.map((item) => (
          <article key={item.name} className="detail-card">
            <h3>{item.name}</h3>
            <p>{item.fields.map((field) => `${field.name}: ${field.type}`).join(" / ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
