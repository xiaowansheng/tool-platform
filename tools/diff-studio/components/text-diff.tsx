"use client";

import { useState } from "react";

type DiffKind = "equal" | "added" | "removed";

interface DiffRow {
  kind: DiffKind;
  value: string;
}

interface ComponentProps {
  leftText: string;
  onChangeLeftText: (text: string) => void;
  rightText: string;
  onChangeRightText: (text: string) => void;
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

export default function TextDiffTab({ leftText, onChangeLeftText, rightText, onChangeRightText }: ComponentProps) {
  let rows: DiffRow[] = [];
  let error = "";

  try {
    if (leftText || rightText) {
      rows = buildDiff(splitLines(leftText), splitLines(rightText));
    }
  } catch (diffError) {
    error = diffError instanceof Error ? diffError.message : "文本对比失败";
  }

  const summary = summarize(rows);
  const changed = summary.added + summary.removed;

  const handleClear = () => {
    onChangeLeftText("");
    onChangeRightText("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>原始文本 (左侧)</span>
          <textarea 
            value={leftText} 
            onChange={(event) => onChangeLeftText(event.target.value)} 
            placeholder="在此处输入/粘贴原始文本..."
            spellCheck={false} 
            style={{ minHeight: "220px", fontFamily: "monospace" }}
          />
        </label>
        <label className="tool-field">
          <span>目标文本 (右侧)</span>
          <textarea 
            value={rightText} 
            onChange={(event) => onChangeRightText(event.target.value)} 
            placeholder="在此处输入/粘贴修改后的对比文本..."
            spellCheck={false} 
            style={{ minHeight: "220px", fontFamily: "monospace" }}
          />
        </label>
      </div>

      {(leftText || rightText) && (
        <>
          <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>新增行</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--success, #10b981)" }}>{summary.added}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>删除行</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--danger, #ef4444)" }}>{summary.removed}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>未变更行</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{summary.unchanged}</div>
            </article>
            <article className="detail-card" style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>总变更</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: changed > 0 ? "var(--warning, #f59e0b)" : "var(--text-primary)" }}>{changed}</div>
            </article>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="button--danger" onClick={handleClear}>清空输入</button>
          </div>

          <article className="diff-view" aria-label="文本差异结果" style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", fontFamily: "monospace", fontSize: "0.85rem", background: "var(--bg-base)" }}>
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const isAdded = row.kind === "added";
                const isRemoved = row.kind === "removed";
                const bgColor = isAdded ? "rgba(16, 185, 129, 0.1)" : isRemoved ? "rgba(239, 68, 68, 0.1)" : "transparent";
                const markerColor = isAdded ? "var(--success, #10b981)" : isRemoved ? "var(--danger, #ef4444)" : "var(--text-tertiary)";
                return (
                  <div 
                    key={row.kind + "-" + index + "-" + row.value} 
                    style={{ 
                      display: "flex", 
                      padding: "0.2rem 0.5rem", 
                      backgroundColor: bgColor,
                      borderBottom: "1px solid var(--border-muted, #f3f4f6)"
                    }}
                  >
                    <span style={{ width: "24px", color: markerColor, fontWeight: "bold", userSelect: "none" }}>
                      {isAdded ? "+" : isRemoved ? "-" : " "}
                    </span>
                    <code style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{row.value || " "}</code>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                暂无任何差异。两侧文本内容完全一致！
              </div>
            )}
          </article>
        </>
      )}

      {error ? <p className="tool-error" style={{ color: "var(--danger, #ef4444)" }}>{error}</p> : null}
      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
        当前使用行级最长公共子序列（LCS）算法进行比对，适合普通的文本文件、配置、代码及日志。
      </p>
    </div>
  );
}
