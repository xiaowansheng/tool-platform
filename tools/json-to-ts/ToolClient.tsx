"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "Generated";
}

function typeOfValue(value: unknown, name: string, interfaces: string[]): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    const sample = value.find((item) => item !== null);
    return sample === undefined ? "unknown[]" : `${typeOfValue(sample, `${name}Item`, interfaces)}[]`;
  }

  if (typeof value === "object") {
    const interfaceName = toPascalCase(name);
    interfaces.push(buildInterface(value as Record<string, unknown>, interfaceName, interfaces));
    return interfaceName;
  }

  return typeof value;
}

function buildInterface(record: Record<string, unknown>, name: string, interfaces: string[]) {
  const fields = Object.entries(record).map(([key, value]) => {
    const safeKey = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
    return `  ${safeKey}: ${typeOfValue(value, key, interfaces)};`;
  });

  return `export interface ${name} {\n${fields.join("\n")}\n}`;
}

function generateTypes(input: string, rootName: string) {
  const parsed = JSON.parse(input) as unknown;
  const sample = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    throw new Error("JSON 顶层需要是对象或对象数组");
  }

  const nested: string[] = [];
  const root = buildInterface(sample as Record<string, unknown>, toPascalCase(rootName), nested);

  return [...nested, root].join("\n\n");
}

export default function JsonToTsTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState('{\n  "id": "tool-1",\n  "name": "JSON Formatter",\n  "featured": true,\n  "tags": ["json", "dev"],\n  "meta": { "runtime": "simple" }\n}');
  const [rootName, setRootName] = useState("ToolRecord");
  const [copied, setCopied] = useState(false);

  let output = "";
  let error = "";

  try {
    output = generateTypes(input, rootName);
  } catch (generateError) {
    error = generateError instanceof Error ? generateError.message : "类型生成失败";
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">TypeScript Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>Root interface</span>
          <input value={rootName} onChange={(event) => setRootName(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyOutput()}>
          {copied ? "已复制" : "复制类型"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JSON</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>TypeScript</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
