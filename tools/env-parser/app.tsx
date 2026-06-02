"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type OutputMode = "json" | "export" | "example";

function stripQuotes(value: string) {
  const trimmed = value.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseEnv(input: string) {
  const record: Record<string, string> = {};
  const ignored: string[] = [];

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      return;
    }

    const normalized = line.replace(/^export\s+/, "");
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex === -1) {
      ignored.push("第 " + (index + 1) + " 行缺少 =：" + rawLine);
      return;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripQuotes(normalized.slice(separatorIndex + 1));

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      ignored.push("第 " + (index + 1) + " 行变量名不规范：" + key);
      return;
    }

    record[key] = value;
  });

  return { record, ignored };
}

function toExport(record: Record<string, string>) {
  return Object.entries(record).map(([key, value]) => "export " + key + "=" + JSON.stringify(value)).join("\n");
}

function toExample(record: Record<string, string>) {
  return Object.keys(record).map((key) => key + "=").join("\n");
}

function hasSensitiveKey(key: string) {
  return /(secret|token|password|passwd|key|credential|private)/i.test(key);
}

export default function EnvParserTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("API_URL=https://api.example.com\nNODE_ENV=development\nFEATURE_FLAG=true\nAPI_TOKEN=replace-me");
  const [mode, setMode] = useState<OutputMode>("json");
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => parseEnv(input), [input]);
  const entries = Object.entries(parsed.record);
  const sensitiveCount = entries.filter(([key]) => hasSensitiveKey(key)).length;
  const output = mode === "json"
    ? JSON.stringify(parsed.record, null, 2)
    : mode === "export"
      ? toExport(parsed.record)
      : toExample(parsed.record);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">配置整理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>输出模式</span>
          <select value={mode} onChange={(event) => { setMode(event.target.value as OutputMode); setCopied(false); }}>
            <option value="json">JSON</option>
            <option value="export">Shell export</option>
            <option value="example">.env.example</option>
          </select>
        </label>
        <button type="button" className="button--primary" onClick={() => void copyOutput()} disabled={!output}>
          {copied ? "已复制输出" : "复制输出"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>变量数</h3>
          <p>{entries.length}</p>
        </article>
        <article className="detail-card">
          <h3>敏感键</h3>
          <p>{sensitiveCount}</p>
        </article>
        <article className="detail-card">
          <h3>忽略行</h3>
          <p>{parsed.ignored.length}</p>
        </article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>.env 输入</span>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      {parsed.ignored.length > 0 ? <p className="tool-error">{parsed.ignored.join("；")}</p> : null}
      <p className="tool-note">敏感键统计只按变量名启发式判断；生成 .env.example 时会清空所有值，适合提交到仓库前复核。</p>
    </section>
  );
}
