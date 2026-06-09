"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Card {
  front: string;
  back: string;
  tags: string;
}

const sampleInput = [
  "HTTP 304? | Resource not modified; the client can reuse its cache. | http cache",
  "React useMemo? | Cache expensive derived values between renders. | react perf",
  "{{c1::CAP theorem}} describes the tradeoff between consistency, availability, and partition tolerance. | Cloze card example | distributed-system"
].join("\n");

function cleanField(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function escapeTsv(value: string) {
  return value.trim().replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
}

function escapeCsv(value: string) {
  return '"' + value.replace(/"/g, '""').replace(/\r?\n/g, "<br>") + '"';
}

function parseCards(input: string): Card[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("\t") ? "\t" : line.includes("|") ? "|" : "::";
      const parts = line.split(separator).map(cleanField);
      return { front: parts[0] ?? "", back: parts[1] ?? "", tags: parts.slice(2).join(" ") };
    })
    .filter((card) => card.front && card.back);
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AnkiCardExporterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleInput);
  const [deckName, setDeckName] = useState("tool-platform-review");
  const [copied, setCopied] = useState(false);

  const cards = useMemo(() => parseCards(input), [input]);
  const tsv = useMemo(() => cards.map((card) => [card.front, card.back, card.tags].map(escapeTsv).join("\t")).join("\n"), [cards]);
  const csv = useMemo(() => cards.map((card) => [card.front, card.back, card.tags].map(escapeCsv).join(",")).join("\n"), [cards]);
  const tagCount = useMemo(() => Array.from(new Set(cards.flatMap((card) => card.tags.split(/\s+/).filter(Boolean)))).length, [cards]);
  const clozeCount = useMemo(() => cards.filter((card) => /\{\{c\d+::/.test(card.front) || /\{\{c\d+::/.test(card.back)).length, [cards]);

  async function copyTsv() {
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">Spaced repetition</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact"><span>Deck name</span><input value={deckName} onChange={(event) => setDeckName(event.target.value)} /></label>
        <button type="button" onClick={() => void copyTsv()} disabled={!tsv}>{copied ? "Copied TSV" : "Copy TSV"}</button>
        <button type="button" onClick={() => downloadText((deckName || "anki-cards") + ".txt", tsv, "text/tab-separated-values;charset=utf-8")} disabled={!tsv}>Download Anki TXT</button>
        <button type="button" onClick={() => downloadText((deckName || "anki-cards") + ".csv", csv, "text/csv;charset=utf-8")} disabled={!csv}>Download CSV</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>Cards input</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setCopied(false); }} spellCheck={false} /></label>
        <label className="tool-field"><span>Anki import TSV</span><textarea value={tsv} readOnly spellCheck={false} /></label>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>Cards</h3><p>{cards.length}</p></article>
        <article className="detail-card"><h3>Cloze cards</h3><p>{clozeCount}</p></article>
        <article className="detail-card"><h3>Tags</h3><p>{tagCount}</p></article>
      </div>
      <div className="detail-card"><h3>Preview</h3><div className="tag-list">{cards.slice(0, 8).map((card, index) => <span className="tag" key={card.front + index}>{card.front} -&gt; {card.back}</span>)}</div></div>
    </section>
  );
}
