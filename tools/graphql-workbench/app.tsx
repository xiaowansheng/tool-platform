"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface GraphqlType {
  name: string;
  fields: Array<{ name: string; args: string; type: string }>;
}

function parseSchema(schema: string): GraphqlType[] {
  return Array.from(schema.matchAll(/type\s+(\w+)\s*\{([^}]+)\}/g)).map((match) => ({
    name: match[1] ?? "Unknown",
    fields: (match[2] ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const fieldMatch = line.match(/^(\w+)(?:\(([^)]*)\))?\s*:\s*(.+)$/);

        return {
          name: fieldMatch?.[1] ?? line,
          args: fieldMatch?.[2]?.trim() ?? "",
          type: fieldMatch?.[3]?.trim() ?? "String"
        };
      })
  }));
}

const scalarTypes = new Set(["ID", "String", "Int", "Float", "Boolean"]);

function namedType(type: string) {
  return type.replace(/[![\]\s]/g, "");
}

function argumentValue(type: string) {
  const scalar = namedType(type);

  if (scalar === "Int" || scalar === "Float") return "0";
  if (scalar === "Boolean") return "false";
  return `"${scalar === "ID" ? "id" : "value"}"`;
}

function formatArgs(args: string) {
  if (!args) return "";

  const rendered = args
    .split(",")
    .map((arg) => {
      const [name = "", type = "String"] = arg.split(":").map((part) => part.trim());
      return name ? `${name}: ${argumentValue(type)}` : "";
    })
    .filter(Boolean)
    .join(", ");

  return rendered ? `(${rendered})` : "";
}

function renderField(field: GraphqlType["fields"][number], typeMap: Map<string, GraphqlType>, depth: number) {
  const fieldName = `${field.name}${formatArgs(field.args)}`;
  const targetType = typeMap.get(namedType(field.type));

  if (!targetType || scalarTypes.has(namedType(field.type))) {
    return `${" ".repeat(depth)}${fieldName}`;
  }

  const childFields = targetType.fields
    .filter((child) => scalarTypes.has(namedType(child.type)))
    .map((child) => `${" ".repeat(depth + 2)}${child.name}`)
    .join("\n") || `${" ".repeat(depth + 2)}id`;

  return `${" ".repeat(depth)}${fieldName} {\n${childFields}\n${" ".repeat(depth)}}`;
}

function buildQuery(type: GraphqlType, types: GraphqlType[]) {
  const typeMap = new Map(types.map((item) => [item.name, item]));
  const isOperationType = ["Query", "Mutation", "Subscription"].includes(type.name);
  const operation = type.name === "Mutation" ? "mutation" : type.name === "Subscription" ? "subscription" : "query";

  if (isOperationType) {
    const fields = type.fields.map((field) => renderField(field, typeMap, 2)).join("\n");

    return `${operation} ${type.name}Draft {\n${fields || "  id"}\n}`;
  }

  const rootField = type.name.charAt(0).toLowerCase() + type.name.slice(1);
  const fields = type.fields
    .filter((field) => scalarTypes.has(namedType(field.type)))
    .map((field) => `    ${field.name}`)
    .join("\n") || "    id";

  return `query ${type.name}Query {\n  ${rootField} {\n${fields}\n  }\n}`;
}

export default function GraphqlWorkbenchTool({ manifest }: ToolAppProps) {
  const [schema, setSchema] = useState("type Tool {\n  id: ID!\n  name: String!\n  runtime: String!\n}\n\ntype Query {\n  tool(id: ID!): Tool\n  tools: [Tool!]!\n}");
  const types = parseSchema(schema);
  const [selected, setSelected] = useState("Tool");
  const type = types.find((item) => item.name === selected) ?? types[0];
  const query = type ? buildQuery(type, types) : "";

  async function copyQuery() {
    await navigator.clipboard.writeText(query);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>类型</span>
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
          <span>查询草稿</span>
          <textarea value={query} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        {types.map((item) => (
          <article key={item.name} className="detail-card">
            <h3>{item.name}</h3>
            <p>{item.fields.map((field) => `${field.name}${field.args ? `(${field.args})` : ""}: ${field.type}`).join(" / ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
