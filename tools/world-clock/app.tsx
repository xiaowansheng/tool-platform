"use client";

import { useState, useEffect } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const commonTimezones = [
  { label: "北京时间", tz: "Asia/Shanghai" },
  { label: "东京", tz: "Asia/Tokyo" },
  { label: "首尔", tz: "Asia/Seoul" },
  { label: "新加坡", tz: "Asia/Singapore" },
  { label: "迪拜", tz: "Asia/Dubai" },
  { label: "莫斯科", tz: "Europe/Moscow" },
  { label: "伦敦", tz: "Europe/London" },
  { label: "巴黎", tz: "Europe/Paris" },
  { label: "纽约", tz: "America/New_York" },
  { label: "洛杉矶", tz: "America/Los_Angeles" },
  { label: "芝加哥", tz: "America/Chicago" },
  { label: "悉尼", tz: "Australia/Sydney" }
];

function formatTime(tz: string, date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function formatDate(tz: string, date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

function getUtcOffset(tz: string, date: Date) {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  const diff = (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3600000;
  const sign = diff >= 0 ? "+" : "";
  return `UTC${sign}${diff}`;
}

export default function WorldClock({ manifest }: ToolAppProps) {
  const [now, setNow] = useState(new Date());
  const [selected, setSelected] = useState(commonTimezones.slice(0, 6));
  const [addTz, setAddTz] = useState(commonTimezones[6]?.tz ?? "");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function addTimezone() {
    const tz = commonTimezones.find((t) => t.tz === addTz);
    if (tz && !selected.some((s) => s.tz === tz.tz)) {
      setSelected((prev) => [...prev, tz]);
    }
  }

  function removeTimezone(tz: string) {
    if (selected.length <= 1) return;
    setSelected((prev) => prev.filter((s) => s.tz !== tz));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">时间工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>添加时区</span>
          <select value={addTz} onChange={(e) => setAddTz(e.target.value)}>
            {commonTimezones.map((t) => (
              <option key={t.tz} value={t.tz}>{t.label} ({t.tz})</option>
            ))}
          </select>
        </label>
        <button onClick={addTimezone} style={{ alignSelf: "flex-end" }}>
          添加
        </button>
      </div>

      <div className="detail-grid">
        {selected.map((tz) => (
          <article key={tz.tz} className="detail-card" style={{ position: "relative" }}>
            {selected.length > 1 && (
              <button
                onClick={() => removeTimezone(tz.tz)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  padding: "2px 6px",
                  fontSize: 12,
                  opacity: 0.5
                }}
              >
                ✕
              </button>
            )}
            <h3>{tz.label}</h3>
            <p style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(tz.tz, now)}
            </p>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {formatDate(tz.tz, now)}
            </p>
            <p style={{ fontSize: 11, opacity: 0.5 }}>
              {getUtcOffset(tz.tz, now)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
