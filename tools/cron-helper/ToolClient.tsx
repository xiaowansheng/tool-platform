"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface FieldSpec {
  key: string;
  label: string;
  min: number;
  max: number;
}

interface ParsedCronField {
  raw: string;
  values: Set<number>;
  any: boolean;
}

interface CronSchedule {
  minute: ParsedCronField;
  hour: ParsedCronField;
  dayOfMonth: ParsedCronField;
  month: ParsedCronField;
  dayOfWeek: ParsedCronField;
}

interface CronAnalysis {
  summary: string[];
  nextRuns: string[];
}

const fieldSpecs: FieldSpec[] = [
  { key: "minute", label: "分钟", min: 0, max: 59 },
  { key: "hour", label: "小时", min: 0, max: 23 },
  { key: "dayOfMonth", label: "日期", min: 1, max: 31 },
  { key: "month", label: "月份", min: 1, max: 12 },
  { key: "dayOfWeek", label: "星期", min: 0, max: 7 }
];

function addRange(values: Set<number>, start: number, end: number, step = 1) {
  if (start > end || step <= 0) {
    throw new Error("范围或步长无效");
  }

  for (let value = start; value <= end; value += step) {
    values.add(value === 7 ? 0 : value);
  }
}

function parseField(raw: string, spec: FieldSpec): ParsedCronField {
  const values = new Set<number>();
  const parts = raw.split(",");

  for (const part of parts) {
    const [rangePart = "", stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;

    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`${spec.label}字段步长无效`);
    }

    if (rangePart === "*") {
      addRange(values, spec.min, spec.max, step);
      continue;
    }

    if (rangePart.includes("-")) {
      const [startValue, endValue] = rangePart.split("-").map(Number);

      if (!Number.isInteger(startValue) || !Number.isInteger(endValue)) {
        throw new Error(`${spec.label}字段范围无效`);
      }

      addRange(values, startValue, endValue, step);
      continue;
    }

    const numeric = Number(rangePart);

    if (!Number.isInteger(numeric)) {
      throw new Error(`${spec.label}字段包含无法识别的值`);
    }

    values.add(numeric === 7 ? 0 : numeric);
  }

  for (const value of values) {
    if (value < spec.min || value > (spec.key === "dayOfWeek" ? 6 : spec.max)) {
      throw new Error(`${spec.label}字段超出范围`);
    }
  }

  return {
    raw,
    values,
    any: raw === "*"
  };
}

function parseCron(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/);

  if (fields.length !== 5) {
    throw new Error("请输入 5 段 Cron 表达式：分钟 小时 日期 月份 星期");
  }

  return {
    minute: parseField(fields[0] ?? "", fieldSpecs[0] as FieldSpec),
    hour: parseField(fields[1] ?? "", fieldSpecs[1] as FieldSpec),
    dayOfMonth: parseField(fields[2] ?? "", fieldSpecs[2] as FieldSpec),
    month: parseField(fields[3] ?? "", fieldSpecs[3] as FieldSpec),
    dayOfWeek: parseField(fields[4] ?? "", fieldSpecs[4] as FieldSpec)
  };
}

function describeField(field: ParsedCronField, label: string) {
  const sorted = Array.from(field.values).sort((left, right) => left - right);

  if (field.raw === "*") {
    return `${label}: 每个可用值`;
  }

  if (/^\*\/\d+$/.test(field.raw)) {
    return `${label}: 每 ${field.raw.slice(2)} 个单位`;
  }

  if (sorted.length <= 8) {
    return `${label}: ${sorted.join(", ")}`;
  }

  return `${label}: ${sorted[0]}-${sorted[sorted.length - 1]} 共 ${sorted.length} 个值`;
}

function matchesSchedule(date: Date, schedule: CronSchedule) {
  const dayOfMonthMatch = schedule.dayOfMonth.values.has(date.getDate());
  const dayOfWeekMatch = schedule.dayOfWeek.values.has(date.getDay());
  const dayMatches = schedule.dayOfMonth.any && schedule.dayOfWeek.any
    ? true
    : schedule.dayOfMonth.any
      ? dayOfWeekMatch
      : schedule.dayOfWeek.any
        ? dayOfMonthMatch
        : dayOfMonthMatch || dayOfWeekMatch;

  return (
    schedule.minute.values.has(date.getMinutes()) &&
    schedule.hour.values.has(date.getHours()) &&
    schedule.month.values.has(date.getMonth() + 1) &&
    dayMatches
  );
}

function findNextRuns(schedule: CronSchedule, count: number) {
  const runs: string[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxScanMinutes = 366 * 24 * 60;

  for (let scanned = 0; scanned < maxScanMinutes && runs.length < count; scanned += 1) {
    if (matchesSchedule(cursor, schedule)) {
      runs.push(cursor.toLocaleString());
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return runs;
}

function analyzeCron(expression: string): CronAnalysis {
  const schedule = parseCron(expression);

  return {
    summary: [
      describeField(schedule.minute, "分钟"),
      describeField(schedule.hour, "小时"),
      describeField(schedule.dayOfMonth, "日期"),
      describeField(schedule.month, "月份"),
      describeField(schedule.dayOfWeek, "星期")
    ],
    nextRuns: findNextRuns(schedule, 5)
  };
}

export default function CronHelperTool({ manifest }: ToolClientProps) {
  const [expression, setExpression] = useState("*/15 9-17 * * 1-5");
  const [analysis, setAnalysis] = useState<CronAnalysis>(() => analyzeCron("*/15 9-17 * * 1-5"));
  const [error, setError] = useState("");

  function handleAnalyze() {
    try {
      setAnalysis(analyzeCron(expression));
      setError("");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Cron 解析失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Ops Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>Cron 表达式</span>
          <input value={expression} onChange={(event) => setExpression(event.target.value)} />
        </label>
        <button type="button" onClick={handleAnalyze}>
          解析
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <article className="detail-card">
          <h3>字段解释</h3>
          <ul className="compact-list">
            {analysis.summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="detail-card">
          <h3>后续运行时间</h3>
          <ol className="compact-list">
            {analysis.nextRuns.length > 0 ? (
              analysis.nextRuns.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>未来一年内未匹配</li>
            )}
          </ol>
        </article>
      </div>
      <p className="tool-note">支持数字、逗号、范围、星号和步长语法，例如 0,30、9-18、*/15。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
