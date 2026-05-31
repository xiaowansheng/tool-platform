"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const words = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "integer", "rhoncus", "velit", "vitae", "nibh", "facilisis", "porta", "curabitur",
  "workflow", "platform", "runtime", "canvas", "system", "module", "signal", "studio"
];

function sentence(seed: number, length: number) {
  const selected = Array.from({ length }, (_, index) => words[(seed + index * 5) % words.length] ?? "lorem");
  const text = selected.join(" ");

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function generate(count: number, sentencesPerParagraph: number) {
  return Array.from({ length: count }, (_, paragraphIndex) =>
    Array.from({ length: sentencesPerParagraph }, (_, sentenceIndex) =>
      sentence(paragraphIndex * 7 + sentenceIndex * 3, 8 + ((paragraphIndex + sentenceIndex) % 6))
    ).join(" ")
  ).join("\n\n");
}

export default function LoremIpsumGeneratorTool({ manifest }: ToolClientProps) {
  const [paragraphs, setParagraphs] = useState(3);
  const [sentences, setSentences] = useState(4);
  const [copied, setCopied] = useState(false);
  const output = generate(Math.max(1, Math.min(20, paragraphs)), Math.max(1, Math.min(12, sentences)));

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>段落</span>
          <input type="number" min={1} max={20} value={paragraphs} onChange={(event) => setParagraphs(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>每段句数</span>
          <input type="number" min={1} max={12} value={sentences} onChange={(event) => setSentences(Number(event.target.value))} />
        </label>
        <button type="button" onClick={() => void copyOutput()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <label className="tool-field">
        <span>占位文本</span>
        <textarea value={output} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
