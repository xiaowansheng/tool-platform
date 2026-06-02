"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleCsv = `name,age,city,email,score
Alice,28,Beijing,alice@example.com,92
Bob,35,Shanghai,bob@example.com,85
Charlie,,Shenzhen,charlie@test.com,78
Diana,42,Beijing,,95
Eve,31,Guangzhou,eve@example.com,
Frank,29,Shanghai,frank@test.com,88
Grace,38,,grace@example.com,72`;

interface ColumnProfile {
  name: string;
  type: "number" | "email" | "text" | "empty";
  total: number;
  nonEmpty: number;
  empty: number;
  unique: number;
  min?: string;
  max?: string;
  avg?: number;
  topValues: { value: string; count: number }[];
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0]!.split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));

  return { headers, rows };
}

function inferType(values: string[]): ColumnProfile["type"] {
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length === 0) return "empty";

  const allNumbers = nonEmpty.every((v) => !Number.isNaN(Number(v)));
  if (allNumbers) return "number";

  const allEmails = nonEmpty.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  if (allEmails) return "email";

  return "text";
}

function profileColumns(headers: string[], rows: string[][]): ColumnProfile[] {
  return headers.map((header, colIndex) => {
    const values = rows.map((row) => row[colIndex] ?? "");
    const nonEmptyValues = values.filter(Boolean);
    const uniqueSet = new Set(nonEmptyValues);
    const type = inferType(values);

    const freq = new Map<string, number>();
    for (const v of nonEmptyValues) {
      freq.set(v, (freq.get(v) ?? 0) + 1);
    }
    const topValues = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    const profile: ColumnProfile = {
      name: header,
      type,
      total: values.length,
      nonEmpty: nonEmptyValues.length,
      empty: values.length - nonEmptyValues.length,
      unique: uniqueSet.size,
      topValues
    };

    if (type === "number" && nonEmptyValues.length > 0) {
      const nums = nonEmptyValues.map(Number);
      profile.min = String(Math.min(...nums));
      profile.max = String(Math.max(...nums));
      profile.avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    } else if (type === "text" && nonEmptyValues.length > 0) {
      const sorted = [...nonEmptyValues].sort();
      profile.min = sorted[0] ?? "";
      profile.max = sorted[sorted.length - 1] ?? "";
    }

    return profile;
  });
}

const typeLabels: Record<ColumnProfile["type"], string> = {
  number: "数值",
  email: "邮箱",
  text: "文本",
  empty: "全空"
};

export default function CsvProfileWorkerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleCsv);
  const [delimiter, setDelimiter] = useState(",");
  const [copied, setCopied] = useState(false);

  const { headers, rows } = useMemo(() => {
    if (!input.trim()) return { headers: [], rows: [] };
    const text = delimiter === "," ? input : input.replace(new RegExp(delimiter === "\\t" ? "\t" : delimiter, "g"), ",");
    return parseCsv(text);
  }, [input, delimiter]);

  const profiles = useMemo(() => profileColumns(headers, rows), [headers, rows]);

  const reportText = useMemo(() => {
    if (profiles.length === 0) return "";
    return profiles
      .map((p) => {
        let line = `${p.name} (${typeLabels[p.type]}): ${p.nonEmpty}/${p.total} 非空, ${p.unique} 唯一值`;
        if (p.avg !== undefined) line += `, 均值=${p.avg.toFixed(2)}`;
        if (p.min !== undefined) line += `, min=${p.min}, max=${p.max}`;
        return line;
      })
      .join("\n");
  }, [profiles]);

  async function handleCopy() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据画像</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>分隔符</span>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
            <option value=",">逗号 ,</option>
            <option value=";">分号 ;</option>
            <option value="\\t">制表符 Tab</option>
            <option value="|">管道 |</option>
          </select>
        </label>
        <button type="button" onClick={() => void handleCopy()} disabled={!reportText}>
          {copied ? "已复制" : "复制报告"}
        </button>
        <button type="button" onClick={() => { setInput(sampleCsv); setCopied(false); }}>重置示例</button>
        <button type="button" onClick={() => { setInput(""); setCopied(false); }}>清空</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>列数</h3>
          <p>{headers.length}</p>
        </article>
        <article className="detail-card">
          <h3>行数</h3>
          <p>{rows.length}</p>
        </article>
        <article className="detail-card">
          <h3>总单元格</h3>
          <p>{(headers.length * rows.length).toLocaleString()}</p>
        </article>
      </div>

      <label className="tool-field">
        <span>CSV 数据</span>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setCopied(false); }}
          spellCheck={false}
          rows={10}
          placeholder="粘贴 CSV 数据…"
        />
      </label>

      {profiles.length > 0 && (
        <div className="detail-grid">
          {profiles.map((profile) => (
            <article key={profile.name} className="detail-card">
              <h3>{profile.name}</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                类型: {typeLabels[profile.type]}
              </p>
              <p style={{ fontSize: "0.85rem" }}>
                非空: {profile.nonEmpty}/{profile.total} | 唯一: {profile.unique}
              </p>
              {profile.avg !== undefined && (
                <p style={{ fontSize: "0.85rem" }}>
                  均值: {profile.avg.toFixed(2)} | 范围: [{profile.min}, {profile.max}]
                </p>
              )}
              {profile.type === "text" && profile.min !== undefined && (
                <p style={{ fontSize: "0.85rem" }}>
                  字典序: [{profile.min}, {profile.max}]
                </p>
              )}
              {profile.topValues.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>高频值:</p>
                  {profile.topValues.map((tv) => (
                    <p key={tv.value} style={{ fontSize: "0.8rem" }}>
                      <code>{tv.value}</code> ×{tv.count}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="tool-note">
        列类型基于启发式推断，适合快速了解数据质量。
        对于大数据集，建议先采样后分析。
      </p>
    </section>
  );
}
