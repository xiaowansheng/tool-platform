"use client";

import { useState, useMemo } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseTimestamp(input: string) {
  const trimmed = input.trim();
  const numeric = Number(trimmed);

  if (Number.isFinite(numeric) && trimmed !== "") {
    if (trimmed.length === 16) {
      return new Date(numeric / 1000);
    }
    if (trimmed.length <= 10) {
      return new Date(numeric * 1000);
    }
    return new Date(numeric);
  }

  return new Date(trimmed);
}

function formatDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const ms = date.getTime();
  const s = Math.floor(ms / 1000);

  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((ms - startOfYear.getTime()) / 86400000) + 1;

  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() + 1 - (weekStart.getDay() || 7));
  const weekYearStart = new Date(weekStart.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((weekStart.getTime() - weekYearStart.getTime()) / 86400000 + 1) / 7);

  const timezoneOffset = -date.getTimezoneOffset();
  const tzHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const tzMinutes = Math.abs(timezoneOffset) % 60;
  const tzSign = timezoneOffset >= 0 ? "+" : "-";
  const tzString = `UTC${tzSign}${String(tzHours).padStart(2, "0")}:${String(tzMinutes).padStart(2, "0")}`;

  return {
    unixSeconds: s,
    unixMilliseconds: ms,
    unixNanoseconds: (s * 1_000_000_000 + (ms % 1000) * 1_000_000).toString(),
    rfc2822: date.toUTCString().replace("GMT", "UTC"),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString("zh-CN", { hour12: false }),
    local12h: date.toLocaleString("zh-CN", { hour12: true }),
    us: date.toLocaleString("en-US", { hour12: true }),
    jp: date.toLocaleString("ja-JP", { hour12: false }),
    year: date.getFullYear().toString(),
    month: (date.getMonth() + 1).toString().padStart(2, "0"),
    day: date.getDate().toString().padStart(2, "0"),
    hours: date.getHours().toString().padStart(2, "0"),
    minutes: date.getMinutes().toString().padStart(2, "0"),
    seconds: date.getSeconds().toString().padStart(2, "0"),
    weekday: weekdays[date.getDay()],
    dayOfYear,
    weekNumber,
    timezone: tzString,
    relative: getRelativeTime(ms),
  };
}

function getRelativeTime(ms: number) {
  const now = Date.now();
  const diff = ms - now;
  const abs = Math.abs(diff);
  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (abs < 1000) return "刚刚";
  if (diff > 0) {
    if (years > 0) return `${years} 年后`;
    if (months > 0) return `${months} 个月后`;
    if (days > 0) return `${days} 天后`;
    if (hours > 0) return `${hours} 小时后`;
    if (minutes > 0) return `${minutes} 分钟后`;
    return `${seconds} 秒后`;
  }
  if (years > 0) return `${years} 年前`;
  if (months > 0) return `${months} 个月前`;
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return `${seconds} 秒前`;
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Moscow",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function TimestampConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(() => Math.floor(Date.now() / 1000).toString());
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [copied, setCopied] = useState("");

  const date = useMemo(() => parseTimestamp(input), [input]);
  const result = useMemo(() => formatDate(date), [date]);
  const dateValid = result !== null;
  const ms = dateValid ? date.getTime() : 0;
  const todayLocal = dateValid ? date.toISOString().slice(0, 10) : "";

  const tzTime = useMemo(() => {
    if (!result) return "";
    try {
      return date.toLocaleString("zh-CN", {
        timeZone: timezone,
        hour12: false,
      });
    } catch {
      return "不支持的时区";
    }
  }, [ms, timezone]);

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  function setNowSeconds() {
    setInput(Math.floor(Date.now() / 1000).toString());
  }

  function setNowMilliseconds() {
    setInput(Date.now().toString());
  }

  function setIsoExample() {
    setInput("2026-05-31T12:00:00Z");
  }

  function setRfcExample() {
    setInput("Mon, 01 Jun 2026 08:00:00 UTC");
  }

  function handleDatePickerChange(value: string) {
    if (value) {
      setInput(`${value}T00:00:00`);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">时间换算</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--stack">
        <div className="tool-toolbar">
          <label className="tool-field tool-field--compact">
            <span>时间戳或日期时间</span>
            <input value={input} onChange={(event) => { setInput(event.target.value); setCopied(""); }} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>日期选择</span>
            <input type="date" value={todayLocal} onChange={(event) => { handleDatePickerChange(event.target.value); setCopied(""); }} />
          </label>
        </div>

        <div className="tool-toolbar">
          <button type="button" onClick={setNowSeconds}>当前秒级</button>
          <button type="button" onClick={setNowMilliseconds}>当前毫秒级</button>
          <button type="button" onClick={setIsoExample}>ISO 示例</button>
          <button type="button" onClick={setRfcExample}>RFC 示例</button>
        </div>
      </div>

      {result ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>Unix 秒</h3>
                <button type="button" onClick={() => void copyValue("unix-seconds", result.unixSeconds.toString())}>
                  {copied === "unix-seconds" ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{result.unixSeconds.toLocaleString()}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>Unix 毫秒</h3>
                <button type="button" onClick={() => void copyValue("unix-ms", result.unixMilliseconds.toString())}>
                  {copied === "unix-ms" ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{result.unixMilliseconds.toLocaleString()}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>Unix 纳秒</h3>
                <button type="button" onClick={() => void copyValue("unix-ns", result.unixNanoseconds)}>
                  {copied === "unix-ns" ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{result.unixNanoseconds}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>相对时间</h3>
                <button type="button" onClick={() => void copyValue("relative", result.relative)}>
                  {copied === "relative" ? "已复制" : "复制"}
                </button>
              </div>
              <p>{result.relative}</p>
            </article>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>ISO 8601</h3>
                <button type="button" onClick={() => void copyValue("iso", result.iso)}>
                  {copied === "iso" ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{result.iso}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>RFC 2822</h3>
                <button type="button" onClick={() => void copyValue("rfc2822", result.rfc2822)}>
                  {copied === "rfc2822" ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{result.rfc2822}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>UTC 时间</h3>
                <button type="button" onClick={() => void copyValue("utc", result.utc)}>
                  {copied === "utc" ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{result.utc}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>本地时间 (zh-CN)</h3>
                <button type="button" onClick={() => void copyValue("local", result.local)}>
                  {copied === "local" ? "已复制" : "复制"}
                </button>
              </div>
              <p>{result.local}</p>
            </article>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>美式 (en-US)</h3>
                <button type="button" onClick={() => void copyValue("us", result.us)}>
                  {copied === "us" ? "已复制" : "复制"}
                </button>
              </div>
              <p>{result.us}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>日本 (ja-JP)</h3>
                <button type="button" onClick={() => void copyValue("jp", result.jp)}>
                  {copied === "jp" ? "已复制" : "复制"}
                </button>
              </div>
              <p>{result.jp}</p>
            </article>
            <article className="detail-card">
              <div className="tool-card__header">
                <h3>{result.timezone}</h3>
                <button type="button" onClick={() => void copyValue("tz", result.local)}>
                  {copied === "tz" ? "已复制" : "复制"}
                </button>
              </div>
              <p>{result.local}</p>
            </article>
          </div>

          <div className="tool-toolbar">
            <label className="tool-field tool-field--compact">
              <span>时区换算</span>
              <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
            <span className="mono-output">{tzTime}</span>
            <button type="button" onClick={() => void copyValue("tz-converted", tzTime)}>
              {copied === "tz-converted" ? "已复制" : "复制"}
            </button>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>年份</h3>
              <p>{result.year}</p>
            </article>
            <article className="detail-card">
              <h3>月份</h3>
              <p>{result.month}</p>
            </article>
            <article className="detail-card">
              <h3>日期</h3>
              <p>{result.day}</p>
            </article>
            <article className="detail-card">
              <h3>小时</h3>
              <p>{result.hours}</p>
            </article>
            <article className="detail-card">
              <h3>分钟</h3>
              <p>{result.minutes}</p>
            </article>
            <article className="detail-card">
              <h3>秒钟</h3>
              <p>{result.seconds}</p>
            </article>
            <article className="detail-card">
              <h3>星期</h3>
              <p>{result.weekday}</p>
            </article>
            <article className="detail-card">
              <h3>年第几天</h3>
              <p>{result.dayOfYear}</p>
            </article>
            <article className="detail-card">
              <h3>年第几周</h3>
              <p>{result.weekNumber}</p>
            </article>
          </div>
        </>
      ) : null}

      <p className="tool-note">
        10 位数字按秒级时间戳解析，13 位按毫秒级，16 位按微秒级解析。
        支持 ISO 8601、RFC 2822 等常见日期格式输入。
      </p>
    </section>
  );
}
