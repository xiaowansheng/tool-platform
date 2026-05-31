"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type DiffKind = "equal" | "added" | "removed";

interface DiffRow {
  kind: DiffKind;
  value: string;
}

function splitLines(value: string) {
  return value.length === 0 ? [] : value.split(/\r?\n/);
}

function buildDiff(left: string[], right: string[]) {
  if (left.length * right.length > 90000) {
    throw new Error("文本过大，请先缩小输入范围再对比");
  }

  const matrix = Array.from({ length: left.length + 1 }, () => Array.from({ length: right.length + 1 }, () => 0));

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      matrix[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
        ? (matrix[leftIndex + 1]?.[rightIndex + 1] ?? 0) + 1
        : Math.max(matrix[leftIndex + 1]?.[rightIndex] ?? 0, matrix[leftIndex]?.[rightIndex + 1] ?? 0);
    }
  }

  const rows: DiffRow[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      rows.push({ kind: "equal", value: left[leftIndex] ?? "" });
      leftIndex += 1;
      rightIndex += 1;
    } else if ((matrix[leftIndex + 1]?.[rightIndex] ?? 0) >= (matrix[leftIndex]?.[rightIndex + 1] ?? 0)) {
      rows.push({ kind: "removed", value: left[leftIndex] ?? "" });
      leftIndex += 1;
    } else {
      rows.push({ kind: "added", value: right[rightIndex] ?? "" });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    rows.push({ kind: "removed", value: left[leftIndex] ?? "" });
    leftIndex += 1;
  }

  while (rightIndex < right.length) {
    rows.push({ kind: "added", value: right[rightIndex] ?? "" });
    rightIndex += 1;
  }

  return rows;
}

function summarize(rows: DiffRow[]) {
  return rows.reduce(
    (summary, row) => ({
      added: summary.added + (row.kind === "added" ? 1 : 0),
      removed: summary.removed + (row.kind === "removed" ? 1 : 0),
      unchanged: summary.unchanged + (row.kind === "equal" ? 1 : 0)
    }),
    { added: 0, removed: 0, unchanged: 0 }
  );
}

export default function TextDiffTool({ manifest }: ToolClientProps) {
  const [left, setLeft] = useState("Tool Platform\nSimple runtime\nWorker runtime\nSearch index");
  const [right, setRight] = useState("Tool Platform\nSimple runtime\nWASM runtime\nSearch index\nPlugin market");

  let rows: DiffRow[] = [];
  let error = "";

  try {
    rows = buildDiff(splitLines(left), splitLines(right));
  } catch (diffError) {
    error = diffError instanceof Error ? diffError.message : "文本对比失败";
  }

  const summary = summarize(rows);
  const changed = summary.added + summary.removed;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本对比</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>原始文本</span>
          <textarea value={left} onChange={(event) => setLeft(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>目标文本</span>
          <textarea value={right} onChange={(event) => setRight(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>新增行</h3>
          <p>{summary.added}</p>
        </article>
        <article className="detail-card">
          <h3>删除行</h3>
          <p>{summary.removed}</p>
        </article>
        <article className="detail-card">
          <h3>未变更</h3>
          <p>{summary.unchanged}</p>
        </article>
        <article className="detail-card">
          <h3>变更行</h3>
          <p>{changed}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="文本差异结果">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <div key={row.kind + "-" + index + "-" + row.value} className={"diff-line diff-line--" + row.kind}>
              <span>{row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}</span>
              <code>{row.value || " "}</code>
            </div>
          ))
        ) : (
          <p className="tool-note">暂无差异</p>
        )}
      </article>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">当前使用行级最长公共子序列对比，适合配置、日志和文档片段；超大文本建议先缩小范围。</p>
    </section>
  );
}
