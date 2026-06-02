"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleText = `人工智能在医疗领域的应用正在快速发展。近年来，深度学习技术在医学影像识别方面取得了重大突破，能够辅助医生进行更精准的诊断。同时，自然语言处理技术也被广泛应用于电子病历分析和临床决策支持系统中。然而，AI在医疗领域的应用仍面临数据隐私、模型可解释性和监管合规等挑战。专家建议，未来应加强跨学科合作，建立更完善的AI医疗应用评估标准和安全框架，确保技术进步能够真正惠及患者。`;

function extractKeyPoints(text: string): string[] {
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const points: string[] = [];
  const keywords = ["突破", "发展", "应用", "挑战", "建议", "重要", "关键", "核心", "趋势", "未来"];

  for (const sentence of sentences) {
    const score = keywords.reduce((acc, kw) => acc + (sentence.includes(kw) ? 1 : 0), 0);
    if (score > 0 || sentences.length <= 5) {
      points.push(sentence);
    }
  }

  return points.length > 0 ? points : sentences.slice(0, 3);
}

function generateSummary(text: string): string {
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return "";
  if (sentences.length <= 2) return text;

  return sentences.slice(0, 2).join("。") + "。";
}

function generateConclusion(text: string): string {
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return "";
  return sentences[sentences.length - 1] || "";
}

type BriefMode = "summary" | "key-points" | "conclusion" | "full";

export default function AiBriefSynthesizerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleText);
  const [mode, setMode] = useState<BriefMode>("full");
  const [copied, setCopied] = useState("");
  const [maxPoints, setMaxPoints] = useState(5);

  function getResult(): string {
    if (!input.trim()) return "";

    switch (mode) {
      case "summary":
        return generateSummary(input);
      case "key-points":
        return extractKeyPoints(input)
          .slice(0, maxPoints)
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n");
      case "conclusion":
        return generateConclusion(input);
      case "full": {
        const summary = generateSummary(input);
        const points = extractKeyPoints(input)
          .slice(0, maxPoints)
          .map((p, i) => `  ${i + 1}. ${p}`)
          .join("\n");
        const conclusion = generateConclusion(input);
        return `【摘要】\n${summary}\n\n【要点】\n${points}\n\n【结论】\n${conclusion}`;
      }
    }
  }

  const result = getResult();
  const wordCount = input.replace(/\s/g, "").length;
  const resultWordCount = result.replace(/\s/g, "").length;
  const compressionRatio = wordCount > 0 ? Math.round((1 - resultWordCount / wordCount) * 100) : 0;

  async function handleCopy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本智能</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>输出模式</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as BriefMode)}>
            <option value="full">完整简报</option>
            <option value="summary">仅摘要</option>
            <option value="key-points">仅要点</option>
            <option value="conclusion">仅结论</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大要点数</span>
          <input
            type="number"
            min={1}
            max={20}
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
        </label>
        <button type="button" onClick={() => void handleCopy("result", result)} disabled={!result}>
          {copied === "result" ? "已复制" : "复制结果"}
        </button>
        <button type="button" onClick={() => { setInput(sampleText); setCopied(""); }}>重置示例</button>
        <button type="button" onClick={() => { setInput(""); setCopied(""); }}>清空</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>原始文本</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setCopied(""); }}
            spellCheck={false}
            rows={14}
            placeholder="粘贴需要提炼的长文本…"
          />
        </label>
        <label className="tool-field">
          <span>简报输出</span>
          <textarea value={result} readOnly spellCheck={false} rows={14} />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入字数</h3>
          <p>{wordCount.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>输出字数</h3>
          <p>{resultWordCount.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>压缩率</h3>
          <p>{compressionRatio}%</p>
        </article>
        <article className="detail-card">
          <h3>输出模式</h3>
          <p>{{ "full": "完整简报", "summary": "摘要", "key-points": "要点", "conclusion": "结论" }[mode]}</p>
        </article>
      </div>

      <p className="tool-note">
        当前为本地规则提取，基于关键词评分和句子位置策略。
        如需更深度的语义理解，可接入 LLM API 进行增强。
      </p>
    </section>
  );
}
