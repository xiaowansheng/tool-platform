"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Row { model: string; latency: number; cost: number; quality: number; notes: string }
function parseRows(input: string): Row[] {
  return input.split(/\r?\n/).map((line) => line.split("|").map((cell) => cell.trim())).filter((cells) => cells.length >= 5).map(([model, latency, cost, quality, notes]) => ({ model: model ?? "", latency: Number(latency), cost: Number(cost), quality: Number(quality), notes: notes ?? "" })).filter((row) => row.model);
}

export default function AiModelBenchmarkTool({ manifest }: ToolAppProps) {
  const [prompt, setPrompt] = useState("Summarize a pull request and list risks.");
  const [rowsText, setRowsText] = useState("gpt-fast | 820 | 0.003 | 82 | concise, missed edge cases\nreasoner-pro | 2400 | 0.018 | 94 | detailed, best risk coverage\nmini | 520 | 0.001 | 70 | cheap baseline");
  const rows = useMemo(() => parseRows(rowsText).map((row) => ({ ...row, score: row.quality - row.latency / 200 - row.cost * 500 })), [rowsText]);
  const winner = rows.slice().sort((a, b) => b.score - a.score)[0];
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Model Eval</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <label className="tool-field"><span>测试 Prompt</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} /></label>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>模型结果，每行：model | latency_ms | cost_usd | quality_0_100 | notes</span><textarea value={rowsText} onChange={(event) => setRowsText(event.target.value)} rows={10} /></label><label className="tool-field"><span>排序摘要</span><textarea value={rows.slice().sort((a, b) => b.score - a.score).map((row, index) => `${index + 1}. ${row.model} score=${row.score.toFixed(1)} quality=${row.quality} latency=${row.latency}ms cost=$${row.cost}`).join("\n")} readOnly rows={10} /></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>参评模型</h3><p>{rows.length}</p></article><article className="detail-card"><h3>推荐</h3><p>{winner?.model ?? "-"}</p></article></div>
    </section>
  );
}
