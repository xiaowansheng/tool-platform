"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

function inferSchema(value: unknown): JsonSchema {
  if (Array.isArray(value)) {
    return { type: "array", items: inferSchema(value[0] ?? null) };
  }
  if (value === null) {
    return { type: "null" };
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return {
      type: "object",
      required: entries.map(([key]) => key),
      properties: Object.fromEntries(entries.map(([key, item]) => [key, inferSchema(item)]))
    };
  }
  if (Number.isInteger(value)) {
    return { type: "integer" };
  }
  return { type: typeof value };
}

function typeMatches(value: unknown, type: string) {
  if (type === "array") return Array.isArray(value);
  if (type === "null") return value === null;
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function validateValue(value: unknown, schema: JsonSchema, path = "$"): string[] {
  const issues: string[] = [];

  if (schema.type && !typeMatches(value, schema.type)) {
    issues.push(`${path}: expected ${schema.type}, got ${Array.isArray(value) ? "array" : value === null ? "null" : typeof value}`);
    return issues;
  }

  if (schema.type === "object" && schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) issues.push(`${path}.${key}: required property missing`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (key in record) issues.push(...validateValue(record[key], childSchema, `${path}.${key}`));
    }
  }

  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    value.forEach((item, index) => issues.push(...validateValue(item, schema.items as JsonSchema, `${path}[${index}]`)));
  }

  return issues;
}

export default function JsonSchemaStudioTool({ manifest }: ToolClientProps) {
  const [sample, setSample] = useState('{\n  "id": "tool-1",\n  "name": "JSON Formatter",\n  "featured": true,\n  "tags": ["json", "schema"]\n}');
  const [schema, setSchema] = useState("");
  const [report, setReport] = useState("生成 schema 后可执行校验。");
  const [error, setError] = useState("");

  function generate() {
    try {
      setSchema(JSON.stringify(inferSchema(JSON.parse(sample)), null, 2));
      setReport("Schema generated.");
      setError("");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Schema 生成失败");
    }
  }

  function validate() {
    try {
      const issues = validateValue(JSON.parse(sample), JSON.parse(schema) as JsonSchema);
      setReport(issues.length > 0 ? issues.join("\n") : "Valid: JSON matches schema subset.");
      setError("");
    } catch (validateError) {
      setError(validateError instanceof Error ? validateError.message : "校验失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Schema Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={generate}>生成 Schema</button>
        <button type="button" onClick={validate}>校验 JSON</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JSON</span>
          <textarea value={sample} onChange={(event) => setSample(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Schema</span>
          <textarea value={schema} onChange={(event) => setSchema(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <label className="tool-field">
        <span>校验报告</span>
        <textarea value={report} readOnly spellCheck={false} />
      </label>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
