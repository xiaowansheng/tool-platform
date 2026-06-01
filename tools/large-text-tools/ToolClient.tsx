"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Action = "split" | "merge" | "dedupeLines" | "dedupeBlocks";
type SplitUnit = "characters" | "lines";

const sampleText = `alpha
beta
alpha

first block
with two lines

first block
with two lines

gamma`;

function splitText(input: string, unit: SplitUnit, size: number) {
  const chunkSize = Math.max(1, size);

  if (unit === "lines") {
    const lines = input.split(/\r?\n/);
    const chunks = [];

    for (let index = 0; index < lines.length; index += chunkSize) {
      chunks.push(lines.slice(index, index + chunkSize).join("\n"));
    }

    return chunks;
  }

  const chunks = [];

  for (let index = 0; index < input.length; index += chunkSize) {
    chunks.push(input.slice(index, index + chunkSize));
  }

  return chunks;
}

function dedupeLines(input: string) {
  const seen = new Set<string>();
  const output = [];

  for (const line of input.split(/\r?\n/)) {
    if (!seen.has(line)) {
      seen.add(line);
      output.push(line);
    }
  }

  return output.join("\n");
}

function dedupeBlocks(input: string) {
  const blocks = input.split(/\n\s*\n/);
  const seen = new Set<string>();
  const output = [];

  for (const block of blocks) {
    const key = block.trim();

    if (key && !seen.has(key)) {
      seen.add(key);
      output.push(block.trim());
    }
  }

  return output.join("\n\n");
}

function runAction(input: string, action: Action, unit: SplitUnit, chunkSize: number, partDelimiter: string, mergeWith: string) {
  if (action === "split") {
    const parts = splitText(input, unit, chunkSize);
    return {
      output: parts.map((part, index) => `--- part ${index + 1} / ${parts.length} ---\n${part}`).join(`\n${partDelimiter}\n`),
      parts
    };
  }

  if (action === "merge") {
    const parts = input.split(partDelimiter).map((part) => part.trim()).filter(Boolean);
    return {
      output: parts.join(mergeWith),
      parts
    };
  }

  if (action === "dedupeBlocks") {
    const output = dedupeBlocks(input);
    return {
      output,
      parts: output ? output.split(/\n\s*\n/) : []
    };
  }

  const output = dedupeLines(input);
  return {
    output,
    parts: output ? output.split(/\r?\n/) : []
  };
}

export default function LargeTextToolsTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(sampleText);
  const [action, setAction] = useState<Action>("dedupeLines");
  const [unit, setUnit] = useState<SplitUnit>("lines");
  const [chunkSize, setChunkSize] = useState(4);
  const [partDelimiter, setPartDelimiter] = useState("---");
  const [mergeWith, setMergeWith] = useState("\n");
  const result = useMemo(() => runAction(input, action, unit, chunkSize, partDelimiter, mergeWith), [action, chunkSize, input, mergeWith, partDelimiter, unit]);
  const originalLines = input ? input.split(/\r?\n/).length : 0;
  const outputLines = result.output ? result.output.split(/\r?\n/).length : 0;

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      setInput(await file.text());
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(result.output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">大文本</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>动作</span>
          <select value={action} onChange={(event) => setAction(event.target.value as Action)}>
            <option value="split">分割</option>
            <option value="merge">合并</option>
            <option value="dedupeLines">按行去重</option>
            <option value="dedupeBlocks">按块去重</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>单位</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as SplitUnit)}>
            <option value="lines">行</option>
            <option value="characters">字符</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>块大小</span>
          <input type="number" min="1" value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>分隔符</span>
          <input value={partDelimiter} onChange={(event) => setPartDelimiter(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyOutput()}>
          复制结果
        </button>
        <label className="tool-field tool-field--compact">
          <span>导入文本</span>
          <input type="file" accept=".txt,.log,.csv,.json,.ndjson,.md" onChange={(event) => void loadFile(event)} />
        </label>
      </div>
      <label className="tool-field tool-field--compact">
        <span>合并连接符</span>
        <input value={mergeWith} onChange={(event) => setMergeWith(event.target.value)} />
      </label>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={result.output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>输入行</h3>
          <p>{originalLines}</p>
        </article>
        <article className="detail-card">
          <h3>输出行</h3>
          <p>{outputLines}</p>
        </article>
        <article className="detail-card">
          <h3>分块数</h3>
          <p>{result.parts.length}</p>
        </article>
        <article className="detail-card">
          <h3>字符数</h3>
          <p>{input.length}</p>
        </article>
      </div>
    </section>
  );
}
