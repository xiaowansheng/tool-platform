"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface GradeItem {
  id: string;
  name: string;
  weight: number;
  score: number;
  scored: boolean;
}

const initialItems: GradeItem[] = [
  { id: "homework", name: "Homework", weight: 20, score: 92, scored: true },
  { id: "quiz", name: "Quizzes", weight: 20, score: 88, scored: true },
  { id: "midterm", name: "Midterm", weight: 25, score: 84, scored: true },
  { id: "final", name: "Final", weight: 35, score: 0, scored: false }
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return String(Date.now());
}

export default function GradeWeightCalculatorTool({ manifest }: ToolAppProps) {
  const [items, setItems] = useState<GradeItem[]>(initialItems);
  const [target, setTarget] = useState(90);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const scoredWeight = items.filter((item) => item.scored).reduce((sum, item) => sum + item.weight, 0);
    const earned = items.filter((item) => item.scored).reduce((sum, item) => sum + (item.weight * item.score) / 100, 0);
    const remainingWeight = Math.max(0, totalWeight - scoredWeight);
    const currentAverage = scoredWeight > 0 ? (earned / scoredWeight) * 100 : 0;
    const neededAverage = remainingWeight > 0 ? ((target - earned) / remainingWeight) * 100 : null;
    const projected = totalWeight > 0 ? (earned / totalWeight) * 100 : 0;

    return { totalWeight, scoredWeight, remainingWeight, earned, currentAverage, neededAverage, projected };
  }, [items, target]);
  const summary = [
    `Total weight: ${result.totalWeight.toFixed(1)}%`,
    `Scored weight: ${result.scoredWeight.toFixed(1)}%`,
    `Current average on scored work: ${result.currentAverage.toFixed(2)}%`,
    `Projected if unscored work is zero: ${result.projected.toFixed(2)}%`,
    result.neededAverage === null ? "No remaining unscored weight." : `Needed average on remaining work for ${target}% target: ${result.neededAverage.toFixed(2)}%`
  ].join("\n");

  function updateItem(id: string, patch: Partial<GradeItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setCopied(false);
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
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
          <p className="eyebrow">教育</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => setItems((current) => [...current, { id: createId(), name: "New item", weight: 10, score: 0, scored: false }])}>新增项目</button>
        <button type="button" onClick={() => setItems(initialItems)}>重置示例</button>
        <button type="button" onClick={() => void copySummary()}>{copied ? "已复制" : "复制摘要"}</button>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>目标总评 %</span><input type="number" min="0" max="100" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>当前</h3><p>{result.currentAverage.toFixed(2)}%</p></article>
        <article className="detail-card"><h3>已计分</h3><p>{result.scoredWeight.toFixed(1)}%</p></article>
        <article className="detail-card"><h3>剩余</h3><p>{result.remainingWeight.toFixed(1)}%</p></article>
        <article className="detail-card"><h3>还需</h3><p>{result.neededAverage === null ? "-" : `${result.neededAverage.toFixed(2)}%`}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          {items.map((item) => (
            <article className="detail-card" key={item.id}>
              <label className="tool-field"><span>项目</span><input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /></label>
              <div className="tool-toolbar tool-toolbar--grid">
                <label className="tool-field tool-field--compact"><span>权重 %</span><input type="number" min="0" max="100" value={item.weight} onChange={(event) => updateItem(item.id, { weight: Number(event.target.value) })} /></label>
                <label className="tool-field tool-field--compact"><span>得分 %</span><input type="number" min="0" max="100" value={item.score} onChange={(event) => updateItem(item.id, { score: Number(event.target.value) })} /></label>
                <button type="button" onClick={() => updateItem(item.id, { scored: !item.scored })}>{item.scored ? "已评分" : "未评分"}</button>
                <button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>删除</button>
              </div>
            </article>
          ))}
        </div>
        <label className="tool-field">
          <span>成绩摘要</span>
          <textarea value={summary} readOnly spellCheck={false} />
        </label>
      </div>

      {Math.abs(result.totalWeight - 100) > 0.01 ? <p className="tool-error">当前总权重为 {result.totalWeight.toFixed(1)}%，通常应调整为 100%。</p> : null}
      {result.neededAverage !== null && result.neededAverage > 100 ? <p className="tool-error">目标可能无法通过剩余项目达成。</p> : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">成绩规则因学校和课程不同而异；请以课程 syllabus 的权重和四舍五入规则为准。</p>
    </section>
  );
}
