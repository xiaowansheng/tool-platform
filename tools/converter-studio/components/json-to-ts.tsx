"use client";

import { useState, useEffect } from "react";

interface ComponentProps {
  inputText: string;
  onChangeInputText: (text: string) => void;
}

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
  if (!input.trim()) return "";
  const parsed = JSON.parse(input) as unknown;
  const sample = Array.isArray(parsed) ? parsed.find((item) => item && typeof item === "object" && !Array.isArray(item)) : parsed;

  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    throw new Error("JSON 顶层需要是对象或对象数组");
  }

  const nested: string[] = [];
  const root = buildInterface(sample as Record<string, unknown>, toPascalCase(rootName), nested);

  return [...nested, root].join("\n\n");
}

export default function JsonToTsTab({ inputText, onChangeInputText }: ComponentProps) {
  const [rootName, setRootName] = useState("ToolRecord");
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (inputText.trim()) {
        const types = generateTypes(inputText, rootName);
        setOutput(types);
        setError("");
      } else {
        setOutput("");
        setError("");
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "类型生成失败");
      setOutput("");
    }
  }, [inputText, rootName]);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>根 interface 名称</span>
          <input 
            value={rootName} 
            onChange={(event) => { setRootName(event.target.value); setCopied(false); }} 
            spellCheck={false} 
            style={{ width: "200px" }}
          />
        </label>
        <button type="button" className="button--primary" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制类型" : "复制类型"}
        </button>
      </div>

      {output && (
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>输出字符</span>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{output.length}</div>
          </article>
          <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>状态</span>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: error ? "var(--danger)" : "var(--success, #10b981)" }}>{error ? "待修正" : "已生成"}</div>
          </article>
        </div>
      )}

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>JSON 输入</span>
          <textarea 
            value={inputText} 
            onChange={(event) => { onChangeInputText(event.target.value); setCopied(false); }} 
            placeholder="在此处输入/粘贴 JSON 结构数据..."
            spellCheck={false} 
            style={{ minHeight: "350px", fontFamily: "monospace" }}
          />
        </label>
        <label className="tool-field">
          <span>TypeScript 输出</span>
          <textarea 
            value={output} 
            readOnly 
            placeholder="生成的 TypeScript Interface 将在此处展示..."
            spellCheck={false} 
            style={{ minHeight: "350px", fontFamily: "monospace", background: "var(--bg-muted)" }}
          />
        </label>
      </div>
      {error ? <p className="tool-error" style={{ color: "var(--danger, #ef4444)" }}>{error}</p> : null}
      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
        生成结果是基于样例的草稿；真实接口中的可选字段、枚举和联合类型仍需要人工补充。
      </p>
    </div>
  );
}
