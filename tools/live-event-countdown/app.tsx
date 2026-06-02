"use client";

import { useCallback, useEffect, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface CountdownEvent {
  id: string;
  label: string;
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  expired: boolean;
}

function calcTimeLeft(targetDateStr: string): TimeLeft {
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
    expired: false
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 16);
}

const defaultEvents: CountdownEvent[] = [
  { id: "1", label: "新年", targetDate: `${new Date().getFullYear() + 1}-01-01T00:00` },
  { id: "2", label: "项目截止日", targetDate: getDefaultDate() }
];

export default function LiveEventCountdownTool({ manifest }: ToolAppProps) {
  const [events, setEvents] = useState<CountdownEvent[]>(defaultEvents);
  const [newLabel, setNewLabel] = useState("");
  const [newDate, setNewDate] = useState(getDefaultDate);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLefts = events.map((e) => ({
    event: e,
    time: calcTimeLeft(e.targetDate)
  }));

  const activeCount = timeLefts.filter((t) => !t.time.expired).length;
  const expiredCount = timeLefts.filter((t) => t.time.expired).length;

  const addEvent = useCallback(() => {
    if (!newLabel.trim() || !newDate) return;
    setEvents((prev) => [
      ...prev,
      { id: String(Date.now()), label: newLabel.trim(), targetDate: newDate }
    ]);
    setNewLabel("");
  }, [newLabel, newDate]);

  function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">时间管理</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>事件名称</span>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="输入事件名称"
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>目标时间</span>
          <input
            type="datetime-local"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </label>
        <button type="button" className="button--primary" onClick={addEvent} disabled={!newLabel.trim() || !newDate}>
          添加事件
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>进行中</h3>
          <p>{activeCount}</p>
        </article>
        <article className="detail-card">
          <h3>已到期</h3>
          <p>{expiredCount}</p>
        </article>
        <article className="detail-card">
          <h3>总事件</h3>
          <p>{events.length}</p>
        </article>
      </div>

      <div className="detail-grid">
        {timeLefts.map(({ event, time }) => (
          <article
            key={event.id}
            className="detail-card"
            style={time.expired ? { opacity: 0.6 } : undefined}
          >
            <div className="tool-card__header">
              <h3>{event.label}</h3>
              <button type="button" onClick={() => removeEvent(event.id)} title="移除">
                ×
              </button>
            </div>
            {time.expired ? (
              <p style={{ color: "var(--error, #e53e3e)", fontWeight: 600 }}>已到期</p>
            ) : (
              <p className="mono-output" style={{ fontSize: "1.5rem", letterSpacing: "0.05em" }}>
                {time.days}天 {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
              </p>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              目标: {new Date(event.targetDate).toLocaleString()}
            </p>
          </article>
        ))}
      </div>

      <p className="tool-note">
        倒计时每秒自动更新。添加事件后页面保持实时计时，无需手动刷新。
      </p>
    </section>
  );
}
