"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleText = `Contact our team:
Alice: alice@example.com, +1-555-0101
Bob: bob.smith@company.org, +86-138-0000-1234
Carol: carol_w@domain.net
Support: support@tool-platform.io, +1-555-0199
Visit https://example.com/docs or https://api.service.io/v2 for more info.
Error at line 42: connection timeout after 3000ms
Warning: deprecated API at endpoint /v1/users`;

interface MatchResult {
  line: number;
  fullMatch: string;
  groups: string[];
}

type OutputFormat = "list" | "csv" | "json";

function extractMatches(text: string, pattern: string, flags: string): { matches: MatchResult[]; error: string } {
  if (!pattern) return { matches: [], error: "" };

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (e) {
    return { matches: [], error: e instanceof Error ? e.message : "正则表达式无效" };
  }

  const lines = text.split(/\r?\n/);
  const matches: MatchResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match: RegExpExecArray | null;
    const localRegex = new RegExp(regex.source, regex.flags);

    if (regex.flags.includes("g")) {
      while ((match = localRegex.exec(line)) !== null) {
        matches.push({
          line: i + 1,
          fullMatch: match[0],
          groups: match.slice(1)
        });
        if (match[0].length === 0) localRegex.lastIndex++;
      }
    } else {
      match = localRegex.exec(line);
      if (match) {
        matches.push({
          line: i + 1,
          fullMatch: match[0],
          groups: match.slice(1)
        });
      }
    }
  }

  return { matches, error: "" };
}

export default function RegexBatchExtractorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleText);
  const [pattern, setPattern] = useState("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");
  const [flags, setFlags] = useState("g");
  const [format, setFormat] = useState<OutputFormat>("list");
  const [deduplicate, setDeduplicate] = useState(false);
  const [copied, setCopied] = useState(false);

  const { matches, error } = useMemo(
    () => extractMatches(input, pattern, flags),
    [input, pattern, flags]
  );

  const uniqueMatches = useMemo(() => {
    if (!deduplicate) return matches;
    const seen = new Set<string>();
    return matches.filter((m) => {
      const key = m.fullMatch;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [matches, deduplicate]);

  const output = useMemo(() => {
    switch (format) {
      case "list":
        return uniqueMatches.map((m) => `L${m.line}: ${m.fullMatch}${m.groups.length ? ` [${m.groups.join(", ")}]` : ""}`).join("\n");
      case "csv":
        return ["line,match,groups", ...uniqueMatches.map((m) => `${m.line},"${m.fullMatch}","${m.groups.join("|")}"`)].join("\n");
      case "json":
        return JSON.stringify(uniqueMatches.map((m) => ({ line: m.line, match: m.fullMatch, groups: m.groups })), null, 2);
    }
  }, [uniqueMatches, format]);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本提取</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>正则表达式</span>
          <input
            value={pattern}
            onChange={(e) => { setPattern(e.target.value); setCopied(false); }}
            placeholder="输入正则表达式"
            className="mono-output"
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>标志</span>
          <input
            value={flags}
            onChange={(e) => { setFlags(e.target.value); setCopied(false); }}
            placeholder="gi"
            style={{ width: 60 }}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            <option value="list">逐行列出</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
        <button
          type="button"
          className={deduplicate ? "button--primary" : ""}
          onClick={() => setDeduplicate(!deduplicate)}
        >
          {deduplicate ? "已去重" : "去重"}
        </button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>匹配数</h3>
          <p>{uniqueMatches.length}</p>
        </article>
        <article className="detail-card">
          <h3>总行数</h3>
          <p>{input.split(/\r?\n/).length}</p>
        </article>
        <article className="detail-card">
          <h3>去重前</h3>
          <p>{matches.length}</p>
        </article>
      </div>

      <label className="tool-field">
        <span>输入文本</span>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setCopied(false); }}
          spellCheck={false}
          rows={12}
          placeholder="粘贴需要提取的文本…"
        />
      </label>

      {error && <p className="tool-error">{error}</p>}

      <label className="tool-field">
        <span>提取结果</span>
        <textarea value={output} readOnly spellCheck={false} rows={10} className="mono-output" />
      </label>

      <p className="tool-note">
        支持捕获组提取。使用全局标志 (g) 匹配每行中的所有结果。
        预置示例为邮箱提取，可替换为任意正则。
      </p>
    </section>
  );
}
