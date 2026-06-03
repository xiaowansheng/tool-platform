"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DateDifferenceCalculator({ manifest }: ToolAppProps) {
  const [start, setStart] = useState("2024-01-01");
  const [end, setEnd] = useState(todayStr());
  const [inclusive, setInclusive] = useState(false);

  const result = useMemo(() => {
    const d1 = new Date(start + "T00:00:00");
    const d2 = new Date(end + "T00:00:00");
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    const totalDays = Math.round(diffMs / 86_400_000);
    const adjustedDays = inclusive ? totalDays + 1 : totalDays;

    const weeks = Math.floor(adjustedDays / 7);
    const remainDays = adjustedDays % 7;

    const totalHours = adjustedDays * 24;
    const totalMinutes = totalHours * 60;

    // Year-month-day breakdown
    const [early, late] = d1 <= d2 ? [d1, d2] : [d2, d1];
    let years = late.getFullYear() - early.getFullYear();
    let months = late.getMonth() - early.getMonth();
    let days = late.getDate() - early.getDate();
    if (days < 0) {
      months--;
      const prevMonth = new Date(late.getFullYear(), late.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    return { adjustedDays, weeks, remainDays, totalHours, totalMinutes, years, months, days: days };
  }, [start, end, inclusive]);

  const cards = [
    { label: "总天数", value: `${result.adjustedDays} 天` },
    { label: "周 + 天", value: `${result.weeks} 周 ${result.remainDays} 天` },
    { label: "年月日", value: `${result.years} 年 ${result.months} 月 ${result.days} 天` },
    { label: "总小时", value: result.totalHours.toLocaleString() },
    { label: "总分钟", value: result.totalMinutes.toLocaleString() },
    { label: "总秒数", value: (result.adjustedDays * 86400).toLocaleString() }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">日期工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>开始日期</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>结束日期</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label className="tool-field tool-field--compact" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} />
          <span>包含起止日</span>
        </label>
      </div>
      <div className="detail-grid">
        {cards.map((c) => (
          <article key={c.label} className="detail-card">
            <h3>{c.label}</h3>
            <p>{c.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
