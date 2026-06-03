"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function generateNumeronym(word: string): string {
  if (word.length <= 3) return word;
  const first = word[0]!;
  const last = word[word.length - 1]!;
  const count = word.length - 2;
  return `${first}${count}${last}`;
}

const commonExamples = [
  { word: "internationalization", numeronym: "i18n" },
  { word: "localization", numeronym: "l10n" },
  { word: "accessibility", numeronym: "a11y" },
  { word: "performance", numeronym: "p11e" },
  { word: "infrastructure", numeronym: "i12e" },
  { word: "configuration", numeronym: "c13n" },
  { word: "authentication", numeronym: "a12n" },
  { word: "communication", numeronym: "c11n" },
  { word: "documentation", numeronym: "d11n" },
  { word: "environment", numeronym: "e9t" },
  { word: "development", numeronym: "d9t" },
  { word: "application", numeronym: "a9n" }
];

export default function NumeronymGeneratorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("internationalization\nlocalization\naccessibility\nkubernetes\nhyperparameter");
  const [copied, setCopied] = useState(false);

  const results = input
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((word) => ({ original: word, numeronym: generateNumeronym(word) }));

  async function handleCopy() {
    const text = results.map((r) => `${r.original} → ${r.numeronym}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  async function handleCopyNumeronyms() {
    await navigator.clipboard.writeText(results.map((r) => r.numeronym).join("\n"));
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文字缩写</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <label className="tool-field">
        <span>输入单词（每行一个）</span>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setCopied(false); }}
          spellCheck={false}
          rows={5}
        />
      </label>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleCopy()} disabled={results.length === 0}>
          {copied ? "已复制" : "复制全部"}
        </button>
        <button type="button" onClick={() => void handleCopyNumeronyms()} disabled={results.length === 0}>
          仅复制缩写
        </button>
      </div>

      {results.length > 0 ? (
        <label className="tool-field">
          <span>结果</span>
          <div style={{ maxHeight: "300px", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #333)" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>原始单词</th>
                  <th style={{ textAlign: "center", padding: "4px 8px" }}>缩写</th>
                  <th style={{ textAlign: "center", padding: "4px 8px" }}>字母数</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border, #222)" }}>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{r.original}</td>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace", textAlign: "center", fontWeight: "bold" }}>
                      {r.numeronym}
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "center", opacity: 0.7 }}>
                      {r.original.length} → {r.numeronym.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </label>
      ) : null}

      {/* Reference examples */}
      <label className="tool-field">
        <span>常见 Numeronym 示例</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "2px", padding: "8px 0", fontSize: "0.85em" }}>
          {commonExamples.map((ex) => (
            <div key={ex.word} style={{ padding: "2px 8px" }}>
              <strong>{ex.numeronym}</strong> = {ex.word}
            </div>
          ))}
        </div>
      </label>

      <p className="tool-note">
        Numeronym 规则：保留首尾字母，中间替换为省略的字母数量。3 个字母或更短的单词不做缩写。
        在技术社区中 i18n、l10n、a11y 等已被广泛采用。
      </p>
    </section>
  );
}
