"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function countSyllables(word: string) {
  const matches = word.toLowerCase().replace(/(?:e|es|ed)$/u, "").match(/[aeiouy]+/gu);
  return Math.max(1, matches?.length ?? 1);
}

export default function WordCounterProTool({ manifest }: ToolAppProps) {
  const [text, setText] = useState("Tool Platform helps teams collect small utilities in one workspace. Paste a draft here to inspect length, reading time, and keyword density.");
  const stats = useMemo(() => {
    const words = text.match(/[\p{L}\p{N}'-]+/gu) ?? [];
    const cjk = text.match(/[\u3400-\u9fff]/gu) ?? [];
    const sentences = text.trim() ? Math.max(1, (text.match(/[.!?。！？]+/g) ?? []).length) : 0;
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).length : 0;
    const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
    const readability = sentences && words.length ? 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length) : 0;
    const frequencies = new Map<string, number>();
    for (const word of words.map((item) => item.toLowerCase()).filter((item) => item.length > 2)) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
    const top = [...frequencies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      chars: text.length,
      charsNoSpace: text.replace(/\s/g, "").length,
      words: words.length,
      cjk: cjk.length,
      sentences,
      paragraphs,
      readingMinutes: Math.max(1, Math.ceil(Math.max(words.length / 220, cjk.length / 500))),
      readability: Number.isFinite(readability) ? Math.max(0, Math.min(100, readability)) : 0,
      top
    };
  }, [text]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Writing Metrics</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="detail-grid">
        <article className="detail-card"><h3>词数</h3><p>{stats.words}</p></article>
        <article className="detail-card"><h3>字符数</h3><p>{stats.chars}</p></article>
        <article className="detail-card"><h3>无空格字符</h3><p>{stats.charsNoSpace}</p></article>
        <article className="detail-card"><h3>阅读时间</h3><p>{stats.readingMinutes} min</p></article>
        <article className="detail-card"><h3>段落 / 句子</h3><p>{stats.paragraphs} / {stats.sentences}</p></article>
        <article className="detail-card"><h3>可读性</h3><p>{stats.readability.toFixed(0)} / 100</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>文本</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={14} /></label>
        <div className="detail-card">
          <h3>关键词频率</h3>
          {stats.top.length ? stats.top.map(([word, count]) => <p key={word} className="mono-output">{word}: {count}</p>) : <p>暂无关键词。</p>}
          <p className="tool-note">英文可读性使用 Flesch Reading Ease 近似值；中文阅读时间按 500 字/分钟估算。</p>
        </div>
      </div>
    </section>
  );
}
