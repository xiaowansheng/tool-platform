"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Card {
  front: string;
  back: string;
  type: "qa" | "cloze";
}

const sampleNotes = `Spaced repetition improves long-term retention by scheduling reviews before forgetting.
Active recall is more effective than rereading because it forces memory retrieval.
The Feynman technique explains a concept in simple language to reveal gaps.`;

function buildCards(notes: string, keywords: string[]) {
  const sentences = notes.split(/(?<=[.!?。！？])\s+/).map((item) => item.trim()).filter(Boolean);
  const cards: Card[] = [];

  for (const sentence of sentences) {
    const keyword = keywords.find((item) => item && sentence.toLowerCase().includes(item.toLowerCase()));

    cards.push({
      type: "qa",
      front: `Explain: ${sentence.split(/\s+/).slice(0, 5).join(" ")}...`,
      back: sentence
    });

    if (keyword) {
      cards.push({
        type: "cloze",
        front: sentence.replace(new RegExp(keyword, "i"), "{{c1::" + keyword + "}}"),
        back: keyword
      });
    }
  }

  return cards;
}

export default function FlashcardClozeBuilderTool({ manifest }: ToolClientProps) {
  const [notes, setNotes] = useState(sampleNotes);
  const [keywordText, setKeywordText] = useState("retrieval, Feynman, repetition");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const keywords = useMemo(() => keywordText.split(",").map((item) => item.trim()).filter(Boolean), [keywordText]);
  const cards = useMemo(() => buildCards(notes, keywords), [keywords, notes]);
  const tsv = cards.map((card) => `${card.front.replace(/\t/g, " ")}\t${card.back.replace(/\t/g, " ")}\t${card.type}`).join("\n");

  async function copyTsv() {
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">学习工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyTsv()} disabled={cards.length === 0}>{copied ? "已复制" : "复制 Anki TSV"}</button>
        <div className="mono-output">Cards: {cards.length}</div>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>学习笔记</span>
            <textarea value={notes} onChange={(event) => {
              setNotes(event.target.value);
              setCopied(false);
            }} />
          </label>
          <label className="tool-field">
            <span>关键词，用逗号分隔</span>
            <input value={keywordText} onChange={(event) => setKeywordText(event.target.value)} />
          </label>
        </div>
        <div className="workspace workspace--stack">
          {cards.map((card, index) => (
            <article className="detail-card" key={`${card.type}-${index}`}>
              <h3>{card.type.toUpperCase()} #{index + 1}</h3>
              <p>{card.front}</p>
              <div className="mono-output">{card.back}</div>
            </article>
          ))}
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">生成结果适合作为初稿；高质量卡片应保持一个问题只考一个知识点，并用自己的语言改写。</p>
    </section>
  );
}
