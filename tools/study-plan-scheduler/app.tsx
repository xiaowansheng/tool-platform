"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

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

export default function StudyPlanSchedulerTool({ manifest }: ToolAppProps) {
  const [topicsText, setTopicsText] = useState(sampleTopics);
  const [startDate, setStartDate] = useState(today);
  const [days, setDays] = useState(7);
  const [dailyHours, setDailyHours] = useState(2);
  const [reviewEvery, setReviewEvery] = useState(3);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const topics = useMemo(() => parseTopics(topicsText), [topicsText]);
  const sessions = useMemo(() => buildSchedule(topics, startDate, days, dailyHours), [dailyHours, days, startDate, topics]);
  const totalHours = topics.reduce((sum, topic) => sum + topic.hours, 0);
  const scheduledHours = sessions.reduce((sum, session) => sum + session.hours, 0);
  const plan = sessions.map((session) => `${session.date} - ${session.topic} (${session.hours}h)`).join("\n");
  const reviewPlan = sessions
    .filter((_, index) => (index + 1) % Math.max(1, reviewEvery) === 0)
    .map((session) => `${addDays(session.date, 1)} - Review ${session.topic}`)
    .join("\n");
  const markdown = [`# Study Plan`, plan, reviewPlan ? `## Review\n${reviewPlan}` : ""].filter(Boolean).join("\n\n");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">学习计划</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>开始日期</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>天数</span><input type="number" min="1" max="90" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>每天小时</span><input type="number" min="0.5" max="12" step="0.5" value={dailyHours} onChange={(event) => setDailyHours(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>每 N 节复习</span><input type="number" min="1" max="10" value={reviewEvery} onChange={(event) => setReviewEvery(Number(event.target.value))} /></label>
        <button type="button" onClick={() => void copy("plan", markdown)}>{copied === "plan" ? "已复制" : "复制计划"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>主题</h3><p>{topics.length}</p></article>
        <article className="detail-card"><h3>所需</h3><p>{totalHours.toFixed(1)}h</p></article>
        <article className="detail-card"><h3>已排期</h3><p>{scheduledHours.toFixed(1)}h</p></article>
        <article className="detail-card"><h3>容量</h3><p>{(days * dailyHours).toFixed(1)}h</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>主题 | 小时 | high/medium/low</span>
          <textarea value={topicsText} onChange={(event) => {
            setTopicsText(event.target.value);
            setCopied("");
          }} />
        </label>
        <label className="tool-field">
          <span>学习排期</span>
          <textarea value={markdown} readOnly spellCheck={false} />
        </label>
      </div>

      {scheduledHours < totalHours ? <p className="tool-error">当前时间容量不足，还有 {(totalHours - scheduledHours).toFixed(1)}h 未排入计划。</p> : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">高优先级主题会先排期；复习清单基于已排课程生成，适合再导入日历或任务工具。</p>
    </section>
  );
}
