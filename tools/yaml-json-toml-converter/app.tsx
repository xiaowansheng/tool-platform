"use client";

import { useState, useEffect } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Format = "json" | "yaml" | "toml" | "properties";
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
  const root: Record<string, any> = {};
  const stack: { indent: number; obj: Record<string, any> }[] = [{ indent: -1, obj: root }];

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("---")) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (!value) {
      const newObj = {};
      parent[key] = newObj;
      stack.push({ indent, obj: newObj });
    } else {
      parent[key] = parseScalar(value);
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

function parseProperties(input: string): Record<string, ConfigValue> {
  const root: Record<string, ConfigValue> = {};

  for (let line of input.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) {
      continue;
    }

    let splitIndex = -1;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if ((char === "=" || char === ":") && (i === 0 || line[i - 1] !== "\\")) {
        splitIndex = i;
        break;
      }
    }

    let rawKey = "";
    let rawValue = "";
    if (splitIndex !== -1) {
      rawKey = line.slice(0, splitIndex).trim();
      rawValue = line.slice(splitIndex + 1).trim();
    } else {
      const spaceIndex = line.search(/\s/);
      if (spaceIndex !== -1) {
        rawKey = line.slice(0, spaceIndex).trim();
        rawValue = line.slice(spaceIndex + 1).trim();
      } else {
        rawKey = line;
        rawValue = "";
      }
    }

    const unescape = (str: string) => {
      return str.replace(/\\(.)/g, (_, c) => {
        if (c === "n") return "\n";
        if (c === "t") return "\t";
        if (c === "r") return "\r";
        return c;
      });
    };

    const key = unescape(rawKey);
    const value = parseScalar(unescape(rawValue));

    const parts = key.split(".");
    let current: any = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }
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

function toProperties(value: ConfigValue, prefix = ""): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    const escapeVal = (v: any) => {
      const s = String(v);
      return s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        .replace(/\r/g, "\\r");
    };
    return prefix ? `${prefix}=${escapeVal(value)}` : escapeVal(value);
  }

  const lines: string[] = [];
  for (const [key, item] of Object.entries(value)) {
    const escapeKey = (k: string) => {
      return k
        .replace(/\\/g, "\\\\")
        .replace(/=/g, "\\=")
        .replace(/:/g, "\\:")
        .replace(/ /g, "\\ ");
    };
    const nextPrefix = prefix ? `${prefix}.${escapeKey(key)}` : escapeKey(key);
    lines.push(toProperties(item, nextPrefix));
  }
  return lines.filter(Boolean).join("\n");
}

function parseByFormat(input: string, format: Format): ConfigValue {
  if (format === "json") return JSON.parse(input) as ConfigValue;
  if (format === "yaml") return parseYaml(input);
  if (format === "toml") return parseToml(input);
  return parseProperties(input);
}

function serializeByFormat(value: ConfigValue, format: Format) {
  if (format === "json") return JSON.stringify(value, null, 2);
  if (format === "yaml") return toYaml(value);
  if (format === "toml") return toToml(value);
  return toProperties(value);
}

export default function YamlJsonTomlConverterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("name: Tool Platform\nruntime: simple\nmeta:\n  category: developer\n  featured: true");
  const [source, setSource] = useState<Format>("yaml");
  const [target, setTarget] = useState<Format>("json");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function convert() {
    if (!input.trim()) {
      setOutput("");
      setError("");
      return;
    }
    try {
      setOutput(serializeByFormat(parseByFormat(input, source), target));
      setError("");
      setCopied(false);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "配置转换失败");
    }
  }

  // Auto-convert on input/source/target changes
  useEffect(() => {
    convert();
  }, [input, source, target]);

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
            <option value="properties">Properties</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>目标格式</span>
          <select value={target} onChange={(event) => setTarget(event.target.value as Format)}>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="toml">TOML</option>
            <option value="properties">Properties</option>
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
      <p className="tool-note">当前实现覆盖常见扁平配置、嵌套路径和一级 section，不尝试完整替代 YAML/TOML 标准解析器。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
