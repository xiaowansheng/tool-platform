"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ReviewSchedule {
  round: number;
  date: Date;
  daysFromStart: number;
  interval: number;
}

type AlgorithmType = "sm2" | "fibonacci" | "exponential" | "custom";

function generateSM2Schedule(startDate: Date, totalRounds: number): ReviewSchedule[] {
  const schedule: ReviewSchedule[] = [];
  let interval = 1;
  let ef = 2.5;
  let repetitions = 0;
  const currentDate = new Date(startDate);

  for (let i = 0; i < totalRounds; i++) {
    schedule.push({
      round: i + 1,
      date: new Date(currentDate),
      daysFromStart: Math.round((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      interval
    });

    const quality = 4;
    if (quality >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * ef);
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }
    ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    currentDate.setDate(currentDate.getDate() + interval);
  }

  return schedule;
}

function generateFibonacciSchedule(startDate: Date, totalRounds: number): ReviewSchedule[] {
  const schedule: ReviewSchedule[] = [];
  let a = 1, b = 1;
  const currentDate = new Date(startDate);

  for (let i = 0; i < totalRounds; i++) {
    schedule.push({
      round: i + 1,
      date: new Date(currentDate),
      daysFromStart: Math.round((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      interval: a
    });

    currentDate.setDate(currentDate.getDate() + a);
    const temp = a;
    a = a + b;
    b = temp;
  }

  return schedule;
}

function generateExponentialSchedule(startDate: Date, totalRounds: number, base: number = 2): ReviewSchedule[] {
  const schedule: ReviewSchedule[] = [];
  const currentDate = new Date(startDate);
  let daysFromStart = 0;

  for (let i = 0; i < totalRounds; i++) {
    const interval = i === 0 ? 1 : Math.round(Math.pow(base, i - 1));
    schedule.push({
      round: i + 1,
      date: new Date(currentDate),
      daysFromStart,
      interval
    });

    currentDate.setDate(currentDate.getDate() + interval);
    daysFromStart += interval;
  }

  return schedule;
}

function generateCustomSchedule(startDate: Date, intervals: number[]): ReviewSchedule[] {
  const schedule: ReviewSchedule[] = [];
  const currentDate = new Date(startDate);
  let daysFromStart = 0;

  for (let i = 0; i < intervals.length; i++) {
    schedule.push({
      round: i + 1,
      date: new Date(currentDate),
      daysFromStart,
      interval: intervals[i]!
    });

    currentDate.setDate(currentDate.getDate() + intervals[i]!);
    daysFromStart += intervals[i]!;
  }

  return schedule;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function SpacedRepetitionPlannerTool({ manifest }: ToolAppProps) {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("sm2");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalRounds, setTotalRounds] = useState(10);
  const [customIntervals, setCustomIntervals] = useState("1, 3, 7, 14, 30, 60, 90");
  const [topic, setTopic] = useState("");
  const [copied, setCopied] = useState(false);

  const schedule = useMemo(() => {
    const start = new Date(startDate);
    switch (algorithm) {
      case "sm2":
        return generateSM2Schedule(start, totalRounds);
      case "fibonacci":
        return generateFibonacciSchedule(start, totalRounds);
      case "exponential":
        return generateExponentialSchedule(start, totalRounds);
      case "custom": {
        const intervals = customIntervals.split(/[,\s]+/).map(Number).filter((n) => n > 0);
        return generateCustomSchedule(start, intervals);
      }
    }
  }, [algorithm, startDate, totalRounds, customIntervals]);

  const totalDays = schedule.length > 0 ? schedule[schedule.length - 1]!.daysFromStart : 0;

  const outputText = useMemo(() => {
    const header = topic ? `学习计划: ${topic}\n算法: ${algorithm.toUpperCase()}\n开始: ${startDate}\n\n` : "";
    const rows = schedule
      .map((s) => `第 ${s.round} 轮 | ${formatDate(s.date)} | 间隔 ${s.interval} 天 | 第 ${s.daysFromStart} 天`)
      .join("\n");
    return header + rows;
  }, [schedule, topic, algorithm, startDate]);

  async function handleCopy() {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">学习规划</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>主题</span>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="如：日语 N2 词汇" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>算法</span>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}>
            <option value="sm2">SM-2 (推荐)</option>
            <option value="fibonacci">斐波那契</option>
            <option value="exponential">指数增长</option>
            <option value="custom">自定义间隔</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>开始日期</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        {algorithm !== "custom" ? (
          <label className="tool-field tool-field--compact">
            <span>复习轮数</span>
            <input type="number" min={1} max={50} value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value))} />
          </label>
        ) : (
          <label className="tool-field tool-field--compact">
            <span>间隔天数 (逗号分隔)</span>
            <input value={customIntervals} onChange={(e) => setCustomIntervals(e.target.value)} />
          </label>
        )}
        <button type="button" onClick={() => void handleCopy()} disabled={!outputText}>
          {copied ? "已复制" : "复制计划"}
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>复习轮数</h3>
          <p>{schedule.length}</p>
        </article>
        <article className="detail-card">
          <h3>总跨度</h3>
          <p>{totalDays} 天</p>
        </article>
        <article className="detail-card">
          <h3>算法</h3>
          <p>{{ sm2: "SM-2", fibonacci: "斐波那契", exponential: "指数", custom: "自定义" }[algorithm]}</p>
        </article>
      </div>

      {schedule.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid var(--border, #ddd)" }}>轮次</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid var(--border, #ddd)" }}>日期</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid var(--border, #ddd)" }}>间隔天数</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid var(--border, #ddd)" }}>累计天数</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s) => (
                <tr key={s.round}>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--border, #eee)" }}>第 {s.round} 轮</td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--border, #eee)" }}>{formatDate(s.date)}</td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--border, #eee)" }}>{s.interval}</td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--border, #eee)" }}>{s.daysFromStart}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="tool-note">
        SM-2 算法根据记忆质量自动调整间隔，适合长期记忆巩固。
        斐波那契和指数增长适合短期冲刺复习。自定义间隔可手动设置复习节奏。
      </p>
    </section>
  );
}
