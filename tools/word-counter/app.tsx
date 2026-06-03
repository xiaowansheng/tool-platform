"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const WORD_REGEX = /[a-zA-Z0-9]+(?:'[a-z]+)?/g;

interface Stats {
  chars: number;
  charsNoSpaces: number;
  bytes: number;
  words: number;
  cjkChars: number;
  lines: number;
  paragraphs: number;
  sentences: number;
  readingTimeMin: number;
}

function calcStats(text: string): Stats {
  const chars = [...text].length;
  const charsNoSpaces = [...text.replace(/\s/g, "")].length;
  const bytes = new TextEncoder().encode(text).byteLength;
  const words = (text.match(WORD_REGEX) ?? []).length;
  const cjkChars = (text.match(CJK_REGEX) ?? []).length;
  const lines = text ? text.split("\n").length : 0;
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const sentences = (text.match(/[.!?。！？…]+/g) ?? []).length;
  // Reading speed: ~200 wpm for English, ~300 chars/min for CJK
  const englishMinutes = words / 200;
  const cjkMinutes = cjkChars / 300;
  const readingTimeMin = Math.max(1, Math.ceil(englishMinutes + cjkMinutes));

  return { chars, charsNoSpaces, bytes, words, cjkChars, lines, paragraphs, sentences, readingTimeMin };
}

const metrics: { key: keyof Stats; label: string; short: string }[] = [
  { key: "chars", label: "总字符数", short: "字符" },
  { key: "charsNoSpaces", label: "不含空白", short: "无空白" },
  { key: "bytes", label: "UTF-8 字节", short: "字节" },
  { key: "words", label: "英文单词", short: "单词" },
  { key: "cjkChars", label: "中文字符", short: "中文" },
  { key: "lines", label: "行数", short: "行" },
  { key: "paragraphs", label: "段落数", short: "段落" },
  { key: "sentences", label: "句子数", short: "句子" },
  { key: "readingTimeMin", label: "预估阅读（分钟）", short: "阅读" }
];

export default function WordCounterTool({ manifest }: ToolAppProps) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const stats = useMemo(() => calcStats(text), [text]);

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="case-grid">
        {metrics.map((m) => {
          const val = String(stats[m.key]);
          return (
            <article key={m.key} className="detail-card">
              <div className="tool-card__header">
                <div>
                  <p className="eyebrow">{m.short}</p>
                  <h3>{m.label}</h3>
                </div>
                <button type="button" onClick={() => void copy(m.key, val)} disabled={!text}>
                  {copied === m.key ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{val}</p>
            </article>
          );
        })}
      </div>

      <label className="tool-field">
        <span>输入或粘贴文本</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="在此输入或粘贴文本，实时查看统计结果…"
          spellCheck={false}
        />
      </label>

      <p className="tool-note">
        统计在浏览器本地实时完成，不会上传任何文本。中文字符按 Unicode CJK 统一汉字范围识别，阅读速度按中文 300 字/分钟、英文 200 词/分钟估算。
      </p>
    </section>
  );
}
