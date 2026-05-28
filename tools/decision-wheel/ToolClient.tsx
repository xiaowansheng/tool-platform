"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface WheelOption {
  label: string;
  weight: number;
}

const sampleOptions = `Refactor parser | 2
Write tests | 3
Ship docs | 1
Triage backlog | 1`;

function hashSeed(seed: string) {
  let value = 2166136261;

  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function seededRandom(seed: string) {
  let value = hashSeed(seed) || 1;

  return () => {
    value = Math.imul(value, 48271) % 0x7fffffff;
    return (value & 0x7fffffff) / 0x7fffffff;
  };
}

function parseOptions(input: string): WheelOption[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, weightPart] = line.split("|").map((part) => part.trim());
      const weight = Number(weightPart);

      return {
        label: labelPart,
        weight: Number.isFinite(weight) && weight > 0 ? weight : 1
      };
    });
}

function pickOption(options: WheelOption[], seed: string) {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  const roll = seededRandom(seed)() * totalWeight;
  let cursor = 0;

  for (const option of options) {
    cursor += option.weight;

    if (roll <= cursor) {
      return option;
    }
  }

  return options.at(-1) ?? null;
}

export default function DecisionWheelTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleOptions);
  const [seed, setSeed] = useState("tool-platform");
  const [spin, setSpin] = useState(0);
  const [result, setResult] = useState<WheelOption | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const options = useMemo(() => parseOptions(input), [input]);
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  const historyText = history.join("\n");

  function choose() {
    if (options.length === 0) {
      setError("至少输入一个候选项。");
      return;
    }

    const nextSpin = spin + 1;
    const picked = pickOption(options, `${seed}:${nextSpin}`);

    setSpin(nextSpin);
    setResult(picked);
    setError("");
    setCopied(false);

    if (picked) {
      setHistory((items) => [`${nextSpin}. ${picked.label} (weight ${picked.weight})`, ...items].slice(0, 12));
    }
  }

  async function copyHistory() {
    try {
      await navigator.clipboard.writeText(historyText || (result?.label ?? ""));
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
          <p className="eyebrow">Random</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Seed</span>
          <input value={seed} onChange={(event) => {
            setSeed(event.target.value);
            setCopied(false);
          }} />
        </label>
        <button type="button" onClick={() => setSeed(String(Date.now()))}>随机 seed</button>
        <button type="button" onClick={choose}>抽取结果</button>
        <button type="button" onClick={() => void copyHistory()}>{copied ? "已复制" : "复制历史"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>Options</h3><p>{options.length}</p></article>
        <article className="detail-card"><h3>Total weight</h3><p>{totalWeight}</p></article>
        <article className="detail-card"><h3>Spin</h3><p>{spin}</p></article>
        <article className="detail-card"><h3>Result</h3><p>{result?.label ?? "-"}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>候选项，每行格式：名称 | 权重</span>
          <textarea value={input} onChange={(event) => {
            setInput(event.target.value);
            setCopied(false);
          }} />
        </label>
        <label className="tool-field">
          <span>抽取历史</span>
          <textarea value={historyText} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">固定 seed 可复现抽取顺序，适合公开决策、课堂活动或轻量游戏。</p>
    </section>
  );
}
