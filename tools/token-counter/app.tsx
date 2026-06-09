"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const models = [
  { name: "GPT style", input: 0.15, output: 0.60, factor: 1 },
  { name: "Claude style", input: 0.30, output: 1.50, factor: 0.96 },
  { name: "Gemini style", input: 0.10, output: 0.40, factor: 1.08 }
];

function estimateTokens(text: string, factor: number) {
  const cjk = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const ascii = text.length - cjk;
  return Math.max(0, Math.ceil((ascii / 4 + cjk * 1.15) * factor));
}

export default function TokenCounterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("Summarize the project risks and propose next steps in concise bullet points.");
  const [expectedOutput, setExpectedOutput] = useState(800);
  const rows = useMemo(() => models.map((model) => {
    const inputTokens = estimateTokens(input, model.factor);
    const outputTokens = Math.max(0, expectedOutput);
    const cost = (inputTokens / 1_000_000) * model.input + (outputTokens / 1_000_000) * model.output;
    return { ...model, inputTokens, outputTokens, total: inputTokens + outputTokens, cost };
  }), [expectedOutput, input]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">AI Cost</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>预计输出 tokens</span><input type="number" min="0" value={expectedOutput} onChange={(event) => setExpectedOutput(Number(event.target.value))} /></label>
      </div>
      <label className="tool-field"><span>Prompt / 上下文</span><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={8} /></label>
      <div className="detail-grid">
        {rows.map((row) => <article key={row.name} className="detail-card"><h3>{row.name}</h3><p>{row.total.toLocaleString()} tokens</p><p className="mono-output">in {row.inputTokens} + out {row.outputTokens}</p><p className="mono-output">约 ${row.cost.toFixed(6)}</p></article>)}
      </div>
      <p className="tool-note">这是离线估算器，不等同于官方 tokenizer。用于预算、上下文长度和提示词规模粗估。</p>
    </section>
  );
}
