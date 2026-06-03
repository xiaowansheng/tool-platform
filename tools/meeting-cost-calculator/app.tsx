"use client";

import { useState, useMemo, useEffect, useRef } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function MeetingCostCalculator({ manifest }: ToolAppProps) {
  const [attendees, setAttendees] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(200);
  const [durationMin, setDurationMin] = useState(60);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  function startTimer() {
    setElapsed(0);
    setRunning(true);
  }

  function stopTimer() {
    setRunning(false);
  }

  function resetTimer() {
    setRunning(false);
    setElapsed(0);
  }

  const staticCost = useMemo(() => {
    return (attendees * hourlyRate * durationMin) / 60;
  }, [attendees, hourlyRate, durationMin]);

  const liveCost = useMemo(() => {
    const hours = elapsed / 3600;
    return attendees * hourlyRate * hours;
  }, [attendees, hourlyRate, elapsed]);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  const cards = [
    { label: "参会人数", value: `${attendees} 人` },
    { label: "平均时薪", value: `¥${hourlyRate}` },
    { label: "计划时长", value: `${durationMin} 分钟` },
    { label: "预估总成本", value: `¥${staticCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { label: "每分钟成本", value: `¥${((attendees * hourlyRate) / 60).toFixed(2)}` },
    { label: "每秒成本", value: `¥${((attendees * hourlyRate) / 3600).toFixed(4)}` }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">效率工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>参会人数</span>
          <input type="number" value={attendees} onChange={(e) => setAttendees(Math.max(1, Number(e.target.value)))} min={1} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>平均时薪 (¥)</span>
          <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))} min={0} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>会议时长 (分钟)</span>
          <input type="number" value={durationMin} onChange={(e) => setDurationMin(Math.max(1, Number(e.target.value)))} min={1} />
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

      {/* Live timer */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <h3 style={{ marginBottom: 12 }}>实时计时器</h3>
        <p style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {String(elapsedMin).padStart(2, "0")}:{String(elapsedSec).padStart(2, "0")}
        </p>
        <p style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>
          当前成本: ¥{liveCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
          {!running ? (
            <button onClick={startTimer}>{elapsed > 0 ? "继续" : "开始计时"}</button>
          ) : (
            <button onClick={stopTimer}>暂停</button>
          )}
          <button onClick={resetTimer}>重置</button>
        </div>
      </div>
    </section>
  );
}
