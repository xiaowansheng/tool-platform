"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// --- Topic Scheduler Definitions ---
interface Topic {
  name: string;
  hours: number;
  priority: number;
}

interface StudySession {
  date: string;
  topic: string;
  hours: number;
}

const sampleTopics = `React Server Components | 4 | high
TypeScript generics | 3 | medium
Testing strategy | 2 | high
Deployment notes | 1.5 | low`;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function priorityScore(value: string) {
  const normalized = value.toLowerCase();
  if (["high", "高", "p1"].includes(normalized)) return 3;
  if (["medium", "中", "p2"].includes(normalized)) return 2;
  return 1;
}

function parseTopics(input: string): Topic[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, hoursPart = "1", priorityPart = "medium"] = line.split("|").map((part) => part.trim());
      const hours = Number(hoursPart.replace(/h|小时/gi, ""));
      return {
        name: namePart,
        hours: Number.isFinite(hours) && hours > 0 ? hours : 1,
        priority: priorityScore(priorityPart)
      };
    })
    .sort((left, right) => right.priority - left.priority || right.hours - left.hours);
}

function buildSchedule(topics: Topic[], startDate: string, days: number, dailyHours: number): StudySession[] {
  const sessions: StudySession[] = [];
  let dayIndex = 0;
  let usedToday = 0;

  for (const topic of topics) {
    let remaining = topic.hours;
    while (remaining > 0 && dayIndex < days) {
      const capacity = Math.max(0.5, dailyHours - usedToday);
      const hours = Math.min(remaining, capacity);

      sessions.push({
        date: addDays(startDate, dayIndex),
        topic: topic.name,
        hours: Number(hours.toFixed(2))
      });

      remaining = Number((remaining - hours).toFixed(2));
      usedToday += hours;

      if (usedToday >= dailyHours - 0.01) {
        dayIndex += 1;
        usedToday = 0;
      }
    }
  }

  return sessions;
}

// --- Spaced Repetition Definitions ---
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
      interval: intervals[i]
    });

    currentDate.setDate(currentDate.getDate() + intervals[i]);
    daysFromStart += intervals[i];
  }

  return schedule;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function StudyPlanSchedulerTool({ manifest }: ToolAppProps) {
  const [activeTab, setActiveTab] = useState<"scheduler" | "spaced">("scheduler");

  // --- Scheduler Tab States ---
  const [topicsText, setTopicsText] = useState(sampleTopics);
  const [schedulerStartDate, setSchedulerStartDate] = useState(today);
  const [days, setDays] = useState(7);
  const [dailyHours, setDailyHours] = useState(2);
  const [reviewEvery, setReviewEvery] = useState(3);
  const [schedulerCopied, setSchedulerCopied] = useState(false);

  // --- Spaced Repetition Tab States ---
  const [spacedTopic, setSpacedTopic] = useState("");
  const [spacedAlgorithm, setSpacedAlgorithm] = useState<AlgorithmType>("sm2");
  const [spacedStartDate, setSpacedStartDate] = useState(today);
  const [spacedTotalRounds, setSpacedTotalRounds] = useState(10);
  const [customIntervals, setCustomIntervals] = useState("1, 3, 7, 14, 30, 60, 90");
  const [spacedCopied, setSpacedCopied] = useState(false);

  const [error, setError] = useState("");

  // --- Scheduler Mode Calculations ---
  const topics = useMemo(() => parseTopics(topicsText), [topicsText]);
  const sessions = useMemo(() => buildSchedule(topics, schedulerStartDate, days, dailyHours), [dailyHours, days, schedulerStartDate, topics]);
  const totalHours = topics.reduce((sum, topic) => sum + topic.hours, 0);
  const scheduledHours = sessions.reduce((sum, session) => sum + session.hours, 0);
  const planText = sessions.map((session) => `${session.date} - ${session.topic} (${session.hours}h)`).join("\n");
  const reviewPlanText = sessions
    .filter((_, index) => (index + 1) % Math.max(1, reviewEvery) === 0)
    .map((session) => `${addDays(session.date, 1)} - Review ${session.topic}`)
    .join("\n");
  const schedulerMarkdown = [`# Study Plan`, planText, reviewPlanText ? `## Review\n${reviewPlanText}` : ""].filter(Boolean).join("\n\n");

  const handleCopyScheduler = async () => {
    try {
      await navigator.clipboard.writeText(schedulerMarkdown);
      setSchedulerCopied(true);
      setTimeout(() => setSchedulerCopied(false), 2000);
      setError("");
    } catch (err: any) {
      setError(err.message || "复制失败");
    }
  };

  // --- Spaced Repetition Mode Calculations ---
  const spacedSchedule = useMemo(() => {
    const start = new Date(spacedStartDate);
    switch (spacedAlgorithm) {
      case "sm2":
        return generateSM2Schedule(start, spacedTotalRounds);
      case "fibonacci":
        return generateFibonacciSchedule(start, spacedTotalRounds);
      case "exponential":
        return generateExponentialSchedule(start, spacedTotalRounds);
      case "custom": {
        const intervals = customIntervals.split(/[,\s]+/).map(Number).filter((n) => n > 0);
        return generateCustomSchedule(start, intervals);
      }
    }
  }, [spacedAlgorithm, spacedStartDate, spacedTotalRounds, customIntervals]);

  const spacedTotalDays = spacedSchedule.length > 0 ? spacedSchedule[spacedSchedule.length - 1].daysFromStart : 0;

  const spacedOutputText = useMemo(() => {
    const header = spacedTopic ? `学习计划: ${spacedTopic}\n算法: ${spacedAlgorithm.toUpperCase()}\n开始: ${spacedStartDate}\n\n` : "";
    const rows = spacedSchedule
      .map((s) => `第 ${s.round} 轮 | ${formatDate(s.date)} | 间隔 ${s.interval} 天 | 第 ${s.daysFromStart} 天`)
      .join("\n");
    return header + rows;
  }, [spacedSchedule, spacedTopic, spacedAlgorithm, spacedStartDate]);

  const handleCopySpaced = async () => {
    try {
      await navigator.clipboard.writeText(spacedOutputText);
      setSpacedCopied(true);
      setTimeout(() => setSpacedCopied(false), 2000);
      setError("");
    } catch (err: any) {
      setError(err.message || "复制失败");
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">学习计划</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #eee", gap: "24px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("scheduler")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "scheduler" ? "bold" : "normal",
            color: activeTab === "scheduler" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "scheduler" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          📅 主题课程排期
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("spaced")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 4px",
            fontSize: "16px",
            fontWeight: activeTab === "spaced" ? "bold" : "normal",
            color: activeTab === "spaced" ? "#4f46e5" : "#666",
            borderBottom: activeTab === "spaced" ? "3px solid #4f46e5" : "3px solid transparent",
            cursor: "pointer"
          }}
        >
          🔄 间隔重复复习规划
        </button>
      </div>

      {activeTab === "scheduler" ? (
        <>
          {/* Topic Course Scheduler View */}
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>开始日期</span>
              <input type="date" value={schedulerStartDate} onChange={(event) => setSchedulerStartDate(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>天数</span>
              <input type="number" min="1" max="90" value={days} onChange={(event) => setDays(Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>每天小时</span>
              <input type="number" min="0.5" max="12" step="0.5" value={dailyHours} onChange={(event) => setDailyHours(Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>每 N 节复习</span>
              <input type="number" min="1" max="10" value={reviewEvery} onChange={(event) => setReviewEvery(Number(event.target.value))} />
            </label>
            <button type="button" onClick={handleCopyScheduler} disabled={!schedulerMarkdown}>
              {schedulerCopied ? "已复制" : "复制计划"}
            </button>
          </div>

          <div className="detail-grid">
            <article className="detail-card"><h3>主题</h3><p>{topics.length}</p></article>
            <article className="detail-card"><h3>所需</h3><p>{totalHours.toFixed(1)}h</p></article>
            <article className="detail-card"><h3>已排期</h3><p>{scheduledHours.toFixed(1)}h</p></article>
            <article className="detail-card"><h3>容量</h3><p>{(days * dailyHours).toFixed(1)}h</p></article>
          </div>

          <div className="workspace workspace--two-column" style={{ marginTop: "20px" }}>
            <label className="tool-field">
              <span>主题 | 小时 | high/medium/low</span>
              <textarea
                value={topicsText}
                onChange={(event) => setTopicsText(event.target.value)}
                rows={10}
              />
            </label>
            <label className="tool-field">
              <span>学习排期</span>
              <textarea value={schedulerMarkdown} readOnly spellCheck={false} rows={10} />
            </label>
          </div>

          {scheduledHours < totalHours && (
            <p className="tool-error" style={{ marginTop: "12px" }}>
              当前时间容量不足，还有 {(totalHours - scheduledHours).toFixed(1)}h 未排入计划。
            </p>
          )}
        </>
      ) : (
        <>
          {/* Spaced Repetition Planner View */}
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>学习主题</span>
              <input value={spacedTopic} onChange={(e) => setSpacedTopic(e.target.value)} placeholder="如：日语 N2 词汇" />
            </label>
            <label className="tool-field tool-field--compact">
              <span>算法</span>
              <select value={spacedAlgorithm} onChange={(e) => setSpacedAlgorithm(e.target.value as AlgorithmType)}>
                <option value="sm2">SM-2 (推荐)</option>
                <option value="fibonacci">斐波那契</option>
                <option value="exponential">指数增长</option>
                <option value="custom">自定义间隔</option>
              </select>
            </label>
            <label className="tool-field tool-field--compact">
              <span>开始日期</span>
              <input type="date" value={spacedStartDate} onChange={(e) => setSpacedStartDate(e.target.value)} />
            </label>
            {spacedAlgorithm !== "custom" ? (
              <label className="tool-field tool-field--compact">
                <span>复习轮数</span>
                <input type="number" min={1} max={50} value={spacedTotalRounds} onChange={(e) => setSpacedTotalRounds(Number(e.target.value))} />
              </label>
            ) : (
              <label className="tool-field tool-field--compact">
                <span>间隔天数 (逗号分隔)</span>
                <input value={customIntervals} onChange={(e) => setCustomIntervals(e.target.value)} />
              </label>
            )}
            <button type="button" onClick={handleCopySpaced} disabled={!spacedOutputText}>
              {spacedCopied ? "已复制" : "复制计划"}
            </button>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>复习轮数</h3>
              <p>{spacedSchedule.length}</p>
            </article>
            <article className="detail-card">
              <h3>总跨度</h3>
              <p>{spacedTotalDays} 天</p>
            </article>
            <article className="detail-card">
              <h3>算法</h3>
              <p>{{ sm2: "SM-2", fibonacci: "斐波那契", exponential: "指数", custom: "自定义" }[spacedAlgorithm]}</p>
            </article>
          </div>

          {spacedSchedule.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: "20px", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9f9fb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>轮次</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>日期</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>间隔天数</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>累计天数</th>
                  </tr>
                </thead>
                <tbody>
                  {spacedSchedule.map((s) => (
                    <tr key={s.round} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>第 {s.round} 轮</td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{formatDate(s.date)}</td>
                      <td style={{ padding: "8px 12px" }}>{s.interval} 天</td>
                      <td style={{ padding: "8px 12px" }}>第 {s.daysFromStart} 天</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="tool-note" style={{ marginTop: "12px" }}>
            💡 SM-2 算法根据记忆质量自动调整间隔，适合长期记忆巩固。斐波那契和指数增长适合短期冲刺复习。自定义间隔可手动设置复习节奏。
          </p>
        </>
      )}

      {error && <p className="tool-error" style={{ marginTop: "12px" }}>{error}</p>}
    </section>
  );
}
