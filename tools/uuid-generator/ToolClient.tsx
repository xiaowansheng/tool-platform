"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function createUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (Number(character) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(character) / 4)))).toString(16)
  );
}

export default function UuidGeneratorTool({ manifest }: ToolClientProps) {
  const [count, setCount] = useState(8);
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 8 }, createUuid));
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    const nextCount = Math.max(1, Math.min(count, 100));
    setUuids(Array.from({ length: nextCount }, createUuid));
    setCopied(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(uuids.join("\n"));
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Developer Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>数量</span>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={handleGenerate}>
          生成
        </button>
        <button type="button" onClick={() => void handleCopy()}>
          复制
        </button>
      </div>
      <label className="tool-field">
        <span>{copied ? "已复制" : "UUID 列表"}</span>
        <textarea value={uuids.join("\n")} onChange={(event) => setUuids(event.target.value.split(/\r?\n/))} spellCheck={false} />
      </label>
    </section>
  );
}
