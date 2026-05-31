"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function splitWords(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function convertCases(value: string) {
  const words = splitWords(value);

  return [
    {
      label: "camelCase",
      value: words.map((word, index) => (index === 0 ? word : capitalize(word))).join("")
    },
    {
      label: "PascalCase",
      value: words.map(capitalize).join("")
    },
    {
      label: "snake_case",
      value: words.join("_")
    },
    {
      label: "CONSTANT_CASE",
      value: words.join("_").toUpperCase()
    },
    {
      label: "kebab-case",
      value: words.join("-")
    },
    {
      label: "dot.case",
      value: words.join(".")
    },
    {
      label: "Title Case",
      value: words.map(capitalize).join(" ")
    },
    {
      label: "Sentence case",
      value: words.length > 0 ? (capitalize(words[0] ?? "") + " " + words.slice(1).join(" ")).trim() : ""
    }
  ];
}

export default function CaseConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("toolPlatform case converter");
  const [copied, setCopied] = useState("");
  const results = convertCases(input);
  const wordCount = splitWords(input).length;

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">命名整理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>识别单词</h3>
          <p>{wordCount}</p>
        </article>
        <article className="detail-card">
          <h3>输出风格</h3>
          <p>{results.length}</p>
        </article>
      </div>
      <label className="tool-field">
        <span>输入文本</span>
        <textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(""); }} spellCheck={false} />
      </label>
      <div className="case-grid">
        {results.map((result) => (
          <article key={result.label} className="detail-card">
            <div className="tool-card__header">
              <h3>{result.label}</h3>
              <button type="button" onClick={() => void copyValue(result.label, result.value)} disabled={!result.value}>
                {copied === result.label ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mono-output">{result.value || "待输入"}</p>
          </article>
        ))}
      </div>
      <p className="tool-note">当前拆词面向英文、数字和常见分隔符；中文文本会保留在输入中，但不会参与英文命名风格拆词。</p>
    </section>
  );
}
