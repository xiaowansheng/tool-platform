"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type TabId = "interval" | "countdown" | "add-subtract";

interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

function calcInterval(from: string, to: string): Duration | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  const diffMs = Math.abs(b - a);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

function formatDuration(d: Duration): string {
  const parts: string[] = [];
  if (d.days > 0) parts.push(`${d.days} 天`);
  if (d.hours > 0) parts.push(`${d.hours} 小时`);
  if (d.minutes > 0) parts.push(`${d.minutes} 分钟`);
  if (d.seconds > 0 || parts.length === 0) parts.push(`${d.seconds} 秒`);
  return parts.join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function localDatetimeNow(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const HH = pad2(now.getHours());
  const MM = pad2(now.getMinutes());
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
}

function addDurationToDate(
  base: string,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  op: "add" | "subtract"
): string {
  const d = new Date(base);
  if (isNaN(d.getTime())) return "";
  const totalMs = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;
  const result = new Date(op === "add" ? d.getTime() + totalMs : d.getTime() - totalMs);
  return result.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div
    style={{
      background: "var(--bg-muted)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "1rem 1.25rem",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
      {value}
    </div>
    <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>{label}</div>
  </div>
);

export default function TimeCalculatorTool({ manifest }: ToolAppProps) {
  const [tab, setTab] = useState<TabId>("interval");

  // --- Interval ---
  const [fromDate, setFromDate] = useState(() => localDatetimeNow());
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}T00:00`;
  });

  // --- Countdown ---
  const [countdownTarget, setCountdownTarget] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}T00:00`;
  });
  const [countdownLabel, setCountdownLabel] = useState("目标倒计时");
  const [remaining, setRemaining] = useState<Duration | null>(null);
  const [isPast, setIsPast] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Add / Subtract ---
  const [baseDate, setBaseDate] = useState(() => localDatetimeNow());
  const [addDays, setAddDays] = useState(0);
  const [addHours, setAddHours] = useState(0);
  const [addMinutes, setAddMinutes] = useState(0);
  const [addSeconds, setAddSeconds] = useState(0);
  const [addOp, setAddOp] = useState<"add" | "subtract">("add");

  // Live countdown timer
  useEffect(() => {
    if (tab !== "countdown") return;
    const tick = () => {
      const now = Date.now();
      const target = new Date(countdownTarget).getTime();
      if (isNaN(target)) {
        setRemaining(null);
        return;
      }
      const diff = target - now;
      setIsPast(diff < 0);
      const totalSeconds = Math.floor(Math.abs(diff) / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setRemaining({ days, hours, minutes, seconds, totalSeconds });
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tab, countdownTarget]);

  const interval = calcInterval(fromDate, toDate);
  const addResult = addDurationToDate(baseDate, addDays, addHours, addMinutes, addSeconds, addOp);

  const fromMs = new Date(fromDate).getTime();
  const toMs = new Date(toDate).getTime();
  const isReversed = !isNaN(fromMs) && !isNaN(toMs) && fromMs > toMs;

  const TABS: { id: TabId; label: string; emoji: string }[] = [
    { id: "interval", label: "时间间隔", emoji: "📏" },
    { id: "countdown", label: "倒计时", emoji: "⏳" },
    { id: "add-subtract", label: "时间加减", emoji: "➕" },
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">时间工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--accent, #6366f1)" : "2px solid transparent",
              color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: tab === t.id ? 600 : 400,
              padding: "0.6rem 1.1rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "all 0.15s",
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Interval ── */}
      {tab === "interval" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "end" }}>
            <div className="tool-field">
              <span>开始时间</span>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ background: "var(--bg-base)", width: "100%" }}
              />
            </div>
            <div style={{ fontSize: "1.5rem", color: "var(--text-tertiary)", paddingBottom: "0.5rem" }}>→</div>
            <div className="tool-field">
              <span>结束时间</span>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ background: "var(--bg-base)", width: "100%" }}
              />
            </div>
          </div>

          {isReversed && (
            <div style={{ padding: "0.6rem 1rem", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "8px", fontSize: "0.82rem", color: "#d97706" }}>
              ⚠ 开始时间晚于结束时间，已按绝对值计算间隔。
            </div>
          )}

          {interval ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
              <StatCard label="天" value={interval.days} />
              <StatCard label="小时" value={interval.hours} />
              <StatCard label="分钟" value={interval.minutes} />
              <StatCard label="秒" value={interval.seconds} />
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "2rem" }}>请选择有效的开始和结束时间</div>
          )}

          {interval && (
            <div
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem 1.5rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "0.6rem",
              }}
            >
              {[
                { label: "总天数", value: `${Math.floor(interval.totalSeconds / 86400)} 天` },
                { label: "总小时数", value: `${Math.floor(interval.totalSeconds / 3600).toLocaleString()} 小时` },
                { label: "总分钟数", value: `${Math.floor(interval.totalSeconds / 60).toLocaleString()} 分钟` },
                { label: "总秒数", value: `${interval.totalSeconds.toLocaleString()} 秒` },
                { label: "人类可读", value: formatDuration(interval) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{label}</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Countdown ── */}
      {tab === "countdown" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="tool-field">
              <span>目标名称</span>
              <input
                type="text"
                value={countdownLabel}
                onChange={(e) => setCountdownLabel(e.target.value)}
                placeholder="例如：新年快乐"
                style={{ background: "var(--bg-base)", width: "100%" }}
              />
            </div>
            <div className="tool-field">
              <span>目标时间</span>
              <input
                type="datetime-local"
                value={countdownTarget}
                onChange={(e) => setCountdownTarget(e.target.value)}
                style={{ background: "var(--bg-base)", width: "100%" }}
              />
            </div>
          </div>

          <div
            style={{
              background: isPast ? "rgba(239,68,68,0.06)" : "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))",
              border: `1px solid ${isPast ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)"}`,
              borderRadius: "14px",
              padding: "2rem 1.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              {isPast ? "🎊" : "⏳"} {countdownLabel || "倒计时"} {isPast ? "已过去" : ""}
            </div>

            {remaining ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", maxWidth: "480px", margin: "0 auto" }}>
                {[
                  { label: "天", value: remaining.days },
                  { label: "时", value: remaining.hours },
                  { label: "分", value: remaining.minutes },
                  { label: "秒", value: remaining.seconds },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--bg-base)",
                      borderRadius: "10px",
                      padding: "1rem 0.5rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "2.8rem",
                        fontWeight: 700,
                        color: isPast ? "#ef4444" : "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1,
                      }}
                    >
                      {pad2(value)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.4rem" }}>{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-tertiary)" }}>请选择有效的目标时间</div>
            )}

            {remaining && (
              <div style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", marginTop: "1rem" }}>
                共 {remaining.totalSeconds.toLocaleString()} 秒
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", alignSelf: "center" }}>快速设定：</span>
            {[
              { label: "1小时后", offset: 3600 },
              { label: "明天", offset: 86400 },
              { label: "1周后", offset: 86400 * 7 },
              { label: "1个月后", offset: 86400 * 30 },
              { label: "100天后", offset: 86400 * 100 },
              { label: "1年后", offset: 86400 * 365 },
            ].map(({ label, offset }) => (
              <button
                key={label}
                type="button"
                className="button--secondary"
                style={{ fontSize: "0.78rem", padding: "0.2rem 0.6rem" }}
                onClick={() => {
                  const d = new Date(Date.now() + offset * 1000);
                  const str = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
                  setCountdownTarget(str);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Add / Subtract ── */}
      {tab === "add-subtract" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>
          <div className="tool-field">
            <span>基准时间</span>
            <input
              type="datetime-local"
              value={baseDate}
              onChange={(e) => setBaseDate(e.target.value)}
              style={{ background: "var(--bg-base)", maxWidth: "320px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "天", value: addDays, set: setAddDays },
              { label: "小时", value: addHours, set: setAddHours },
              { label: "分钟", value: addMinutes, set: setAddMinutes },
              { label: "秒", value: addSeconds, set: setAddSeconds },
            ].map(({ label, value, set }) => (
              <div key={label} className="tool-field" style={{ gap: "0.25rem" }}>
                <span style={{ fontSize: "0.8rem" }}>{label}</span>
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => set(Math.max(0, Number(e.target.value)))}
                  style={{ background: "var(--bg-base)", width: "90px" }}
                />
              </div>
            ))}

            <div className="tool-field" style={{ gap: "0.25rem" }}>
              <span style={{ fontSize: "0.8rem" }}>操作</span>
              <select
                value={addOp}
                onChange={(e) => setAddOp(e.target.value as "add" | "subtract")}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.4rem 0.7rem", color: "var(--text-primary)" }}
              >
                <option value="add">➕ 加</option>
                <option value="subtract">➖ 减</option>
              </select>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-muted)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.5rem 2rem",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>计算结果</div>
            {addResult ? (
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{addResult}</div>
            ) : (
              <div style={{ color: "var(--text-tertiary)" }}>请输入有效的基准时间</div>
            )}
            {addResult && (
              <button
                type="button"
                className="button--secondary"
                style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}
                onClick={() => navigator.clipboard.writeText(addResult)}
              >
                复制结果
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
