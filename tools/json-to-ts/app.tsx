"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

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
    const samples = Array.from(new Set(value.filter((item) => item !== null).map((item) => typeOfValue(item, name + "Item", interfaces))));
    return samples.length === 0 ? "unknown[]" : (samples.length === 1 ? samples[0] : samples.join(" | ")) + "[]";
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
    return "  " + safeKey + ": " + typeOfValue(value, key, interfaces) + ";";
  });

  return "export interface " + name + " {\n" + fields.join("\n") + "\n}";
}

function generateTypes(input: string, rootName: string) {
  const parsed = JSON.parse(input) as unknown;
  const sample = Array.isArray(parsed) ? parsed.find((item) => item && typeof item === "object" && !Array.isArray(item)) : parsed;

  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    throw new Error("JSON 顶层需要是对象或对象数组");
  }

  const nested: string[] = [];
  const root = buildInterface(sample as Record<string, unknown>, toPascalCase(rootName), nested);

  return [...nested, root].join("\n\n");
}

export default function JsonToTsTool({ manifest }: ToolAppProps) {
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
          <p className="eyebrow">类型草稿</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>根 interface 名称</span>
          <input value={rootName} onChange={(event) => { setRootName(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <button type="button" className="button--primary" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制类型" : "复制类型"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输出字符</h3>
          <p>{output.length}</p>
        </article>
        <article className="detail-card">
          <h3>状态</h3>
          <p>{error ? "待修正" : "已生成"}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JSON 输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>TypeScript 输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">生成结果是基于样例的草稿；真实接口中的可选字段、枚举和联合类型仍需要人工补充。</p>
    </section>
  );
}
