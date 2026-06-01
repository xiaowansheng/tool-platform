"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Format = "json" | "yaml" | "toml";
type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };

function parseScalar(value: string): ConfigValue {
  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((item) => parseScalar(item)).filter((item) => item !== "");
  }

  return trimmed;
}

function parseYaml(input: string): Record<string, ConfigValue> {
  const root: Record<string, ConfigValue> = {};
  let currentObject = root;

  for (const line of input.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const [key = "", ...rest] = line.trim().split(":");
    const value = rest.join(":").trim();

    if (!key) continue;

    if (indent === 0) {
      if (!value) {
        const nested: Record<string, ConfigValue> = {};
        root[key.trim()] = nested;
        currentObject = nested;
      } else {
        root[key.trim()] = parseScalar(value);
        currentObject = root;
      }
    } else {
      currentObject[key.trim()] = parseScalar(value);
    }
  }

  return root;
}

function parseToml(input: string): Record<string, ConfigValue> {
  const root: Record<string, ConfigValue> = {};
  let section = root;

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      const key = sectionMatch[1] ?? "";
      section = {};
      root[key] = section;
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index !== -1) {
      section[trimmed.slice(0, index).trim()] = parseScalar(trimmed.slice(index + 1));
    }
  }

  return root;
}

function toYaml(value: ConfigValue, depth = 0): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return String(value);
  }

  return Object.entries(value)
    .map(([key, item]) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return `${" ".repeat(depth)}${key}:\n${toYaml(item, depth + 2)}`;
      }
      return `${" ".repeat(depth)}${key}: ${Array.isArray(item) ? `[${item.join(", ")}]` : String(item)}`;
    })
    .join("\n");
}

function toToml(value: ConfigValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return String(value);
  }

  const top: string[] = [];
  const sections: string[] = [];

  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      sections.push(`[${key}]\n${Object.entries(item).map(([childKey, childValue]) => `${childKey} = ${JSON.stringify(childValue)}`).join("\n")}`);
    } else {
      top.push(`${key} = ${JSON.stringify(item)}`);
    }
  }

  return [...top, ...sections].join("\n\n");
}

function parseByFormat(input: string, format: Format): ConfigValue {
  if (format === "json") return JSON.parse(input) as ConfigValue;
  if (format === "yaml") return parseYaml(input);
  return parseToml(input);
}

function serializeByFormat(value: ConfigValue, format: Format) {
  if (format === "json") return JSON.stringify(value, null, 2);
  if (format === "yaml") return toYaml(value);
  return toToml(value);
}

export default function YamlJsonTomlConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("name: Tool Platform\nruntime: simple\nmeta:\n  category: developer\n  featured: true");
  const [source, setSource] = useState<Format>("yaml");
  const [target, setTarget] = useState<Format>("json");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function convert() {
    try {
      setOutput(serializeByFormat(parseByFormat(input, source), target));
      setError("");
      setCopied(false);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "配置转换失败");
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">配置工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>源格式</span>
          <select value={source} onChange={(event) => setSource(event.target.value as Format)}>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="toml">TOML</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>目标格式</span>
          <select value={target} onChange={(event) => setTarget(event.target.value as Format)}>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="toml">TOML</option>
          </select>
        </label>
        <button type="button" onClick={convert}>转换</button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>{copied ? "已复制" : "复制输出"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} onChange={(event) => setOutput(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <p className="tool-note">当前实现覆盖常见扁平配置和一级 section，不尝试完整替代 YAML/TOML 标准解析器。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
