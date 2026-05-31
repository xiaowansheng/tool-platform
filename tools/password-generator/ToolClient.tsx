"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?"
};

type CharacterSetKey = keyof typeof characterSets;

const optionLabels: Record<CharacterSetKey, string> = {
  uppercase: "大写字母",
  lowercase: "小写字母",
  numbers: "数字",
  symbols: "符号"
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function secureIndex(max: number) {
  const random = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;

  do {
    crypto.getRandomValues(random);
  } while (random[0] >= limit);

  return random[0] % max;
}

function generatePassword(length: number, enabledSets: CharacterSetKey[]) {
  if (enabledSets.length === 0) {
    throw new Error("至少选择一种字符类型");
  }

  const pool = enabledSets.map((key) => characterSets[key]).join("");
  const required = enabledSets.map((key) => {
    const set = characterSets[key];

    return set[secureIndex(set.length)];
  });
  const remaining = Array.from({ length: Math.max(0, length - required.length) }, () => pool[secureIndex(pool.length)]);
  const combined = [...required, ...remaining];

  for (let index = combined.length - 1; index > 0; index -= 1) {
    const swapIndex = secureIndex(index + 1);
    [combined[index], combined[swapIndex]] = [combined[swapIndex] ?? "", combined[index] ?? ""];
  }

  return combined.join("");
}

function estimateStrength(length: number, enabledSets: CharacterSetKey[]) {
  const poolSize = enabledSets.reduce((total, key) => total + characterSets[key].length, 0);
  const entropy = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

  if (entropy >= 100) {
    return { label: "强", entropy };
  }

  if (entropy >= 70) {
    return { label: "中等", entropy };
  }

  return { label: "较弱", entropy };
}

export default function PasswordGeneratorTool({ manifest }: ToolClientProps) {
  const [length, setLength] = useState(20);
  const [enabled, setEnabled] = useState<Record<CharacterSetKey, boolean>>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [password, setPassword] = useState(() =>
    generatePassword(20, ["uppercase", "lowercase", "numbers", "symbols"])
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const enabledSets = (Object.keys(enabled) as CharacterSetKey[]).filter((key) => enabled[key]);
  const normalizedLength = clamp(length, 8, 128);
  const strength = estimateStrength(normalizedLength, enabledSets);

  function handleGenerate() {
    try {
      setPassword(generatePassword(normalizedLength, enabledSets));
      setCopied(false);
      setError("");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "密码生成失败");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">安全工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>长度</span>
          <input
            type="number"
            min={8}
            max={128}
            value={length}
            onChange={(event) => setLength(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={handleGenerate}>
          生成
        </button>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="tool-option-list">
        {(Object.keys(optionLabels) as CharacterSetKey[]).map((key) => (
          <label key={key} className="tool-check">
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={(event) => setEnabled((current) => ({ ...current, [key]: event.target.checked }))}
            />
            <span>{optionLabels[key]}</span>
          </label>
        ))}
      </div>
      <label className="tool-field">
        <span>结果</span>
        <textarea value={password} onChange={(event) => setPassword(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>强度</h3>
          <p>{strength.label}</p>
        </article>
        <article className="detail-card">
          <h3>熵估算</h3>
          <p>{strength.entropy} 位</p>
        </article>
        <article className="detail-card">
          <h3>字符池</h3>
          <p>{enabledSets.reduce((total, key) => total + characterSets[key].length, 0)}</p>
        </article>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
