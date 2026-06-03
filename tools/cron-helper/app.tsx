"use client";

import { useEffect, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

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

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayZhNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const monthZhNames = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月"
];

const fieldSpecs: FieldSpec[] = [
  { key: "minute", label: "分钟", min: 0, max: 59 },
  { key: "hour", label: "小时", min: 0, max: 23 },
  { key: "dayOfMonth", label: "日期", min: 1, max: 31 },
  { key: "month", label: "月份", min: 1, max: 12 },
  { key: "dayOfWeek", label: "星期", min: 0, max: 7 }
];

function addRange(values: Set<number>, start: number, end: number, step = 1, normalizeSunday = false) {
  if (start > end || step <= 0) {
    throw new Error("范围或步长无效");
  }

  for (let value = start; value <= end; value += step) {
    values.add(normalizeSunday && value === 7 ? 0 : value);
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
      addRange(values, spec.min, spec.max, step, spec.key === "dayOfWeek");
      continue;
    }

    if (rangePart.includes("-")) {
      const [startValue, endValue] = rangePart.split("-").map(Number);

      if (!Number.isInteger(startValue) || !Number.isInteger(endValue)) {
        throw new Error(`${spec.label}字段范围无效`);
      }

      addRange(values, startValue, endValue, step, spec.key === "dayOfWeek");
      continue;
    }

    const numeric = Number(rangePart);

    if (!Number.isInteger(numeric)) {
      throw new Error(`${spec.label}字段包含无法识别的值`);
    }

    values.add(spec.key === "dayOfWeek" && numeric === 7 ? 0 : numeric);
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

function formatRunDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function findNextRuns(schedule: CronSchedule, count: number) {
  const runs: string[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxScanMinutes = 366 * 24 * 60;

  for (let scanned = 0; scanned < maxScanMinutes && runs.length < count; scanned += 1) {
    if (matchesSchedule(cursor, schedule)) {
      runs.push(formatRunDate(cursor));
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

function cronNumberFieldToSystemd(raw: string) {
  if (raw === "*") return "*";
  if (/^\*\/\d+$/.test(raw)) return `0/${raw.slice(2)}`;

  return raw.replace(/-/g, "..");
}

function cronWeekdayToSystemd(raw: string) {
  if (raw === "*") return "";

  return raw.split(",").map((part) => {
    const range = part.match(/^(\d)-(\d)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      return `${weekdayNames[start === 7 ? 0 : start]}..${weekdayNames[end === 7 ? 0 : end]}`;
    }

    const value = Number(part);
    return Number.isInteger(value) ? weekdayNames[value === 7 ? 0 : value] : part;
  }).join(",");
}

function cronToSystemd(expression: string) {
  const fields = expression.trim().split(/\s+/);

  if (fields.length !== 5) {
    throw new Error("Cron 转换需要 5 段表达式");
  }

  const [minute = "*", hour = "*", dayOfMonth = "*", month = "*", dayOfWeek = "*"] = fields;
  const weekday = cronWeekdayToSystemd(dayOfWeek);
  const date = `*-${cronNumberFieldToSystemd(month)}-${cronNumberFieldToSystemd(dayOfMonth)}`;
  const time = `${cronNumberFieldToSystemd(hour)}:${cronNumberFieldToSystemd(minute)}:00`;

  return `${weekday ? `${weekday} ` : ""}${date} ${time}`;
}

function systemdWeekdayToCron(raw = "") {
  if (!raw) return "*";

  const dayToNumber = new Map(weekdayNames.map((name, index) => [name, String(index)]));

  return raw.split(",").map((part) => {
    if (part.includes("..")) {
      const [start = "", end = ""] = part.split("..");
      return `${dayToNumber.get(start) ?? start}-${dayToNumber.get(end) ?? end}`;
    }

    return dayToNumber.get(part) ?? part;
  }).join(",");
}

function systemdFieldToCron(raw: string) {
  if (raw === "*") return "*";
  if (/^0\/\d+$/.test(raw)) return `*/${raw.slice(2)}`;

  return raw.replace(/\.\./g, "-").replace(/^0(\d)$/, "$1");
}

function systemdToCron(expression: string) {
  const preset = expression.trim().toLowerCase();
  const presets: Record<string, string> = {
    hourly: "0 * * * *",
    daily: "0 0 * * *",
    weekly: "0 0 * * 0",
    monthly: "0 0 1 * *",
    yearly: "0 0 1 1 *",
    annually: "0 0 1 1 *"
  };

  if (presets[preset]) {
    return presets[preset];
  }

  const match = expression.trim().match(/^(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:\.\.(Sun|Mon|Tue|Wed|Thu|Fri|Sat))?(?:,[A-Za-z.]+)*\s+)?(?:\*|\d{4})-(\*|\d{1,2}(?:\.\.\d{1,2})?)-(\*|\d{1,2}(?:\.\.\d{1,2})?)\s+([^:]+):([^:]+)(?::[^:]+)?$/);

  if (!match) {
    throw new Error("暂只支持 hourly/daily 等预设或形如 Mon..Fri *-*-* 09:00:00 的 OnCalendar");
  }

  const weekday = expression.trim().match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:\.\.(Sun|Mon|Tue|Wed|Thu|Fri|Sat))?/)?.[0] ?? "";
  const month = match[3] ?? "*";
  const dayOfMonth = match[4] ?? "*";
  const hour = match[5] ?? "*";
  const minute = match[6] ?? "*";

  return [
    systemdFieldToCron(minute),
    systemdFieldToCron(hour),
    systemdFieldToCron(dayOfMonth),
    systemdFieldToCron(month),
    systemdWeekdayToCron(weekday)
  ].join(" ");
}

export default function CronHelperTool({ manifest }: ToolAppProps) {
  const [expression, setExpression] = useState("*/15 9-17 * * 1-5");
  const [systemdExpression, setSystemdExpression] = useState(() => cronToSystemd("*/15 9-17 * * 1-5"));
  const [analysis, setAnalysis] = useState<CronAnalysis>({ summary: [], nextRuns: [] });
  const [error, setError] = useState("");

  // 可视化构建器状态
  const [activeBuilderTab, setActiveBuilderTab] = useState<"minute" | "hour" | "dom" | "month" | "dow">("minute");

  const [minuteType, setMinuteType] = useState<"any" | "step" | "range" | "specific">("step");
  const [minuteStep, setMinuteStep] = useState(15);
  const [minuteRangeStart, setMinuteRangeStart] = useState(0);
  const [minuteRangeEnd, setMinuteRangeEnd] = useState(59);
  const [minuteSpecifics, setMinuteSpecifics] = useState<number[]>([0, 15, 30, 45]);

  const [hourType, setHourType] = useState<"any" | "step" | "range" | "specific">("range");
  const [hourStep, setHourStep] = useState(2);
  const [hourRangeStart, setHourRangeStart] = useState(9);
  const [hourRangeEnd, setHourRangeEnd] = useState(17);
  const [hourSpecifics, setHourSpecifics] = useState<number[]>([9, 12, 15, 18]);

  const [domType, setDomType] = useState<"any" | "step" | "range" | "specific">("any");
  const [domStep, setDomStep] = useState(1);
  const [domRangeStart, setDomRangeStart] = useState(1);
  const [domRangeEnd, setDomRangeEnd] = useState(31);
  const [domSpecifics, setDomSpecifics] = useState<number[]>([1, 15]);

  const [monthType, setMonthType] = useState<"any" | "step" | "range" | "specific">("any");
  const [monthStep, setMonthStep] = useState(1);
  const [monthRangeStart, setMonthRangeStart] = useState(1);
  const [monthRangeEnd, setMonthRangeEnd] = useState(12);
  const [monthSpecifics, setMonthSpecifics] = useState<number[]>([1, 6, 12]);

  const [dowType, setDowType] = useState<"any" | "step" | "range" | "specific">("specific");
  const [dowStep, setDowStep] = useState(1);
  const [dowRangeStart, setDowRangeStart] = useState(1);
  const [dowRangeEnd, setDowRangeEnd] = useState(5);
  const [dowSpecifics, setDowSpecifics] = useState<number[]>([1, 2, 3, 4, 5]);

  // 定时指令状态
  const [command, setCommand] = useState("/usr/local/bin/backup.sh");
  const [logPolicy, setLogPolicy] = useState(">> /var/log/myjob.log 2>&1");
  const [serviceName, setServiceName] = useState("my-backup");
  const [activeTab, setActiveTab] = useState<"crontab" | "systemd_service" | "systemd_timer">("crontab");
  const [copied, setCopied] = useState(false);

  // 1. 同步可视化构建状态到 Cron 表达式
  useEffect(() => {
    const getFieldExpr = (type: string, step: number, start: number, end: number, specifics: number[]) => {
      if (type === "any") return "*";
      if (type === "step") return `*/${step}`;
      if (type === "range") return `${start}-${end}`;
      if (type === "specific") {
        if (specifics.length === 0) return "*";
        return [...specifics].sort((a, b) => a - b).join(",");
      }
      return "*";
    };

    const m = getFieldExpr(minuteType, minuteStep, minuteRangeStart, minuteRangeEnd, minuteSpecifics);
    const h = getFieldExpr(hourType, hourStep, hourRangeStart, hourRangeEnd, hourSpecifics);
    const dom = getFieldExpr(domType, domStep, domRangeStart, domRangeEnd, domSpecifics);
    const mon = getFieldExpr(monthType, monthStep, monthRangeStart, monthRangeEnd, monthSpecifics);
    const dow = getFieldExpr(dowType, dowStep, dowRangeStart, dowRangeEnd, dowSpecifics);

    const expr = `${m} ${h} ${dom} ${mon} ${dow}`;
    setExpression(expr);
    try {
      setSystemdExpression(cronToSystemd(expr));
    } catch {
      // Ignore conversion failures during building
    }
  }, [
    minuteType, minuteStep, minuteRangeStart, minuteRangeEnd, minuteSpecifics,
    hourType, hourStep, hourRangeStart, hourRangeEnd, hourSpecifics,
    domType, domStep, domRangeStart, domRangeEnd, domSpecifics,
    monthType, monthStep, monthRangeStart, monthRangeEnd, monthSpecifics,
    dowType, dowStep, dowRangeStart, dowRangeEnd, dowSpecifics
  ]);

  // 2. 表达式变化时触发分析与解析
  useEffect(() => {
    try {
      setAnalysis(analyzeCron(expression));
      setError("");
    } catch (err) {
      // Keep previous analysis on syntax error
    }
  }, [expression]);

  function handleAnalyze() {
    try {
      setAnalysis(analyzeCron(expression));
      setError("");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Cron 解析失败");
    }
  }

  function handleCronToSystemd() {
    try {
      setSystemdExpression(cronToSystemd(expression));
      setError("");
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Cron 转 systemd 失败");
    }
  }

  function handleSystemdToCron() {
    try {
      const nextExpression = systemdToCron(systemdExpression);
      setExpression(nextExpression);
      setAnalysis(analyzeCron(nextExpression));
      setError("");
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "systemd 转 Cron 失败");
    }
  }

  function toggleSpecific(val: number, specifics: number[], setSpecifics: (v: number[]) => void) {
    if (specifics.includes(val)) {
      setSpecifics(specifics.filter((x) => x !== val));
    } else {
      setSpecifics([...specifics, val]);
    }
  }

  // 拼接 Crontab 定时命令行
  const crontabCommand = `${expression} ${command} ${logPolicy}`.trim();

  // 组装 Systemd Service
  const systemdService = `[Unit]
Description=Scheduled Job (${serviceName})
After=network.target

[Service]
Type=oneshot
ExecStart=${command}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target`;

  // 组装 Systemd Timer
  const systemdTimer = `[Unit]
Description=Run Scheduled Job (${serviceName})

[Timer]
OnCalendar=${systemdExpression}
Persistent=true

[Install]
WantedBy=timers.target`;

  async function copyConfig(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 生成特定选择区域数值数组
  const generateSeq = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <section className="tool-panel">
      <style>{`
        .builder-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        [data-theme="light"] .builder-card {
          background: rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .builder-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        [data-theme="light"] .builder-tabs {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .builder-tab {
          padding: 6px 12px;
          border-radius: 6px;
          background: none;
          border: 1px solid transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }
        .builder-tab:hover {
          color: var(--text-main, #f8fafc);
        }
        [data-theme="light"] .builder-tab:hover {
          color: #1e293b;
        }
        .builder-tab.active {
          background: rgba(99, 102, 241, 0.15);
          color: var(--brand-primary, #6366f1);
          border: 1px solid rgba(99, 102, 241, 0.25);
        }
        .mode-select {
          display: flex;
          gap: 20px;
          margin-bottom: 16px;
        }
        .mode-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          font-weight: 500;
        }
        [data-theme="light"] .mode-label {
          color: #475569;
        }
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
          gap: 8px;
          max-height: 140px;
          overflow-y: auto;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.01);
        }
        [data-theme="light"] .checkbox-grid {
          border: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(0, 0, 0, 0.01);
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-main, #f8fafc);
          cursor: pointer;
        }
        [data-theme="light"] .checkbox-item {
          color: #1e293b;
        }
        .command-tabs {
          display: flex;
          border-bottom: 2px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 12px;
        }
        [data-theme="light"] .command-tabs {
          border-bottom: 2px solid rgba(0, 0, 0, 0.05);
        }
        .command-tab-btn {
          padding: 8px 16px;
          background: none;
          border: none;
          color: var(--text-muted, #94a3b8);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }
        .command-tab-btn:hover {
          color: var(--text-main, #f8fafc);
        }
        [data-theme="light"] .command-tab-btn:hover {
          color: #1e293b;
        }
        .command-tab-btn.active {
          color: var(--brand-primary, #6366f1);
          border-bottom-color: var(--brand-primary, #6366f1);
        }
        .output-box-container {
          position: relative;
        }
        .copy-overlay-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 10px;
          font-size: 11px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.4);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2;
        }
        .copy-overlay-btn:hover {
          background: var(--brand-primary, #6366f1);
          border-color: var(--brand-primary, #6366f1);
        }
        .guide-box {
          margin-top: 10px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          font-size: 11px;
          font-family: var(--font-mono, monospace);
          color: var(--text-muted, #94a3b8);
          line-height: 1.4;
        }
        [data-theme="light"] .guide-box {
          background: rgba(0, 0, 0, 0.01);
          border: 1px dashed rgba(0, 0, 0, 0.08);
          color: #475569;
        }
      `}</style>

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">运维工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--stack">
        {/* 基础手动输入框 */}
        <div className="tool-toolbar tool-toolbar--grid">
          <label className="tool-field tool-field--compact">
            <span>Cron 表达式</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} />
          </label>
          <label className="tool-field tool-field--compact">
            <span>systemd OnCalendar</span>
            <input value={systemdExpression} onChange={(event) => setSystemdExpression(event.target.value)} />
          </label>
        </div>

        <div className="tool-toolbar" style={{ marginBottom: "16px" }}>
          <button type="button" onClick={handleAnalyze}>
            解析
          </button>
          <button type="button" onClick={handleCronToSystemd}>
            Cron → systemd
          </button>
          <button type="button" onClick={handleSystemdToCron}>
            systemd → Cron
          </button>
        </div>

        {/* 可视化配置构建器 */}
        <div className="builder-card">
          <span style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "var(--text-main)" }}>
            可视化 Cron 构建器 (分步选择/填入值)
          </span>

          <div className="builder-tabs">
            <button
              type="button"
              className={`builder-tab ${activeBuilderTab === "minute" ? "active" : ""}`}
              onClick={() => setActiveBuilderTab("minute")}
            >
              分钟 (Min)
            </button>
            <button
              type="button"
              className={`builder-tab ${activeBuilderTab === "hour" ? "active" : ""}`}
              onClick={() => setActiveBuilderTab("hour")}
            >
              小时 (Hour)
            </button>
            <button
              type="button"
              className={`builder-tab ${activeBuilderTab === "dom" ? "active" : ""}`}
              onClick={() => setActiveBuilderTab("dom")}
            >
              日期 (Day)
            </button>
            <button
              type="button"
              className={`builder-tab ${activeBuilderTab === "month" ? "active" : ""}`}
              onClick={() => setActiveBuilderTab("month")}
            >
              月份 (Month)
            </button>
            <button
              type="button"
              className={`builder-tab ${activeBuilderTab === "dow" ? "active" : ""}`}
              onClick={() => setActiveBuilderTab("dow")}
            >
              星期 (Week)
            </button>
          </div>

          <div className="builder-tab-content">
            {/* 分钟构建 */}
            {activeBuilderTab === "minute" && (
              <div>
                <div className="mode-select">
                  <label className="mode-label">
                    <input type="radio" checked={minuteType === "any"} onChange={() => setMinuteType("any")} />
                    每分钟 (*)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={minuteType === "step"} onChange={() => setMinuteType("step")} />
                    周期/间隔 (步长)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={minuteType === "range"} onChange={() => setMinuteType("range")} />
                    指定范围 (从-至)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={minuteType === "specific"} onChange={() => setMinuteType("specific")} />
                    指定多个具体值
                  </label>
                </div>

                {minuteType === "step" && (
                  <label className="tool-field tool-field--compact">
                    <span>时间步长 (每 X 分钟一次)</span>
                    <input type="number" min="1" max="59" value={minuteStep} onChange={(e) => setMinuteStep(Number(e.target.value))} />
                  </label>
                )}
                {minuteType === "range" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>开始分钟</span>
                      <input type="number" min="0" max="59" value={minuteRangeStart} onChange={(e) => setMinuteRangeStart(Number(e.target.value))} />
                    </label>
                    <span style={{ color: "var(--text-muted)", marginTop: "16px" }}>至</span>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>结束分钟</span>
                      <input type="number" min="0" max="59" value={minuteRangeEnd} onChange={(e) => setMinuteRangeEnd(Number(e.target.value))} />
                    </label>
                  </div>
                )}
                {minuteType === "specific" && (
                  <div className="checkbox-grid">
                    {generateSeq(0, 59).map((val) => (
                      <label key={val} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={minuteSpecifics.includes(val)}
                          onChange={() => toggleSpecific(val, minuteSpecifics, setMinuteSpecifics)}
                        />
                        {val}分
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 小时构建 */}
            {activeBuilderTab === "hour" && (
              <div>
                <div className="mode-select">
                  <label className="mode-label">
                    <input type="radio" checked={hourType === "any"} onChange={() => setHourType("any")} />
                    每小时 (*)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={hourType === "step"} onChange={() => setHourType("step")} />
                    周期/间隔 (步长)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={hourType === "range"} onChange={() => setHourType("range")} />
                    指定范围 (从-至)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={hourType === "specific"} onChange={() => setHourType("specific")} />
                    指定多个具体值
                  </label>
                </div>

                {hourType === "step" && (
                  <label className="tool-field tool-field--compact">
                    <span>时间步长 (每 X 小时一次)</span>
                    <input type="number" min="1" max="23" value={hourStep} onChange={(e) => setHourStep(Number(e.target.value))} />
                  </label>
                )}
                {hourType === "range" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>开始小时</span>
                      <input type="number" min="0" max="23" value={hourRangeStart} onChange={(e) => setHourRangeStart(Number(e.target.value))} />
                    </label>
                    <span style={{ color: "var(--text-muted)", marginTop: "16px" }}>至</span>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>结束小时</span>
                      <input type="number" min="0" max="23" value={hourRangeEnd} onChange={(e) => setHourRangeEnd(Number(e.target.value))} />
                    </label>
                  </div>
                )}
                {hourType === "specific" && (
                  <div className="checkbox-grid">
                    {generateSeq(0, 23).map((val) => (
                      <label key={val} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={hourSpecifics.includes(val)}
                          onChange={() => toggleSpecific(val, hourSpecifics, setHourSpecifics)}
                        />
                        {val}点
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 日期构建 */}
            {activeBuilderTab === "dom" && (
              <div>
                <div className="mode-select">
                  <label className="mode-label">
                    <input type="radio" checked={domType === "any"} onChange={() => setDomType("any")} />
                    每天 (*)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={domType === "step"} onChange={() => setDomType("step")} />
                    周期/间隔 (步长)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={domType === "range"} onChange={() => setDomType("range")} />
                    指定范围 (从-至)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={domType === "specific"} onChange={() => setDomType("specific")} />
                    指定多个具体值
                  </label>
                </div>

                {domType === "step" && (
                  <label className="tool-field tool-field--compact">
                    <span>日期步长 (每 X 天一次)</span>
                    <input type="number" min="1" max="31" value={domStep} onChange={(e) => setDomStep(Number(e.target.value))} />
                  </label>
                )}
                {domType === "range" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>开始日期</span>
                      <input type="number" min="1" max="31" value={domRangeStart} onChange={(e) => setDomRangeStart(Number(e.target.value))} />
                    </label>
                    <span style={{ color: "var(--text-muted)", marginTop: "16px" }}>至</span>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>结束日期</span>
                      <input type="number" min="1" max="31" value={domRangeEnd} onChange={(e) => setDomRangeEnd(Number(e.target.value))} />
                    </label>
                  </div>
                )}
                {domType === "specific" && (
                  <div className="checkbox-grid">
                    {generateSeq(1, 31).map((val) => (
                      <label key={val} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={domSpecifics.includes(val)}
                          onChange={() => toggleSpecific(val, domSpecifics, setDomSpecifics)}
                        />
                        {val}日
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 月份构建 */}
            {activeBuilderTab === "month" && (
              <div>
                <div className="mode-select">
                  <label className="mode-label">
                    <input type="radio" checked={monthType === "any"} onChange={() => setMonthType("any")} />
                    每月 (*)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={monthType === "range"} onChange={() => setMonthType("range")} />
                    指定范围 (从-至)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={monthType === "specific"} onChange={() => setMonthType("specific")} />
                    指定多个具体值
                  </label>
                </div>

                {monthType === "range" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>开始月份</span>
                      <input type="number" min="1" max="12" value={monthRangeStart} onChange={(e) => setMonthRangeStart(Number(e.target.value))} />
                    </label>
                    <span style={{ color: "var(--text-muted)", marginTop: "16px" }}>至</span>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>结束月份</span>
                      <input type="number" min="1" max="12" value={monthRangeEnd} onChange={(e) => setMonthRangeEnd(Number(e.target.value))} />
                    </label>
                  </div>
                )}
                {monthType === "specific" && (
                  <div className="checkbox-grid">
                    {generateSeq(1, 12).map((val) => (
                      <label key={val} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={monthSpecifics.includes(val)}
                          onChange={() => toggleSpecific(val, monthSpecifics, setMonthSpecifics)}
                        />
                        {monthZhNames[val - 1]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 星期构建 */}
            {activeBuilderTab === "dow" && (
              <div>
                <div className="mode-select">
                  <label className="mode-label">
                    <input type="radio" checked={dowType === "any"} onChange={() => setDowType("any")} />
                    每周任何天 (*)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={dowType === "range"} onChange={() => setDowType("range")} />
                    指定范围 (从-至)
                  </label>
                  <label className="mode-label">
                    <input type="radio" checked={dowType === "specific"} onChange={() => setDowType("specific")} />
                    指定星期几
                  </label>
                </div>

                {dowType === "range" && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>开始星期</span>
                      <select value={dowRangeStart} onChange={(e) => setDowRangeStart(Number(e.target.value))}>
                        {weekdayZhNames.map((name, i) => (
                          <option key={i} value={i}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <span style={{ color: "var(--text-muted)", marginTop: "16px" }}>至</span>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>结束星期</span>
                      <select value={dowRangeEnd} onChange={(e) => setDowRangeEnd(Number(e.target.value))}>
                        {weekdayZhNames.map((name, i) => (
                          <option key={i} value={i}>{name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {dowType === "specific" && (
                  <div className="checkbox-grid">
                    {generateSeq(0, 6).map((val) => (
                      <label key={val} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={dowSpecifics.includes(val)}
                          onChange={() => toggleSpecific(val, dowSpecifics, setDowSpecifics)}
                        />
                        {weekdayZhNames[val]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 字段分析及运行时间：双列布局 */}
        <div className="workspace workspace--two-column" style={{ padding: 0 }}>
          {/* 左列：解析详情 */}
          <article className="detail-card">
            <h3>字段解析说明</h3>
            <ul className="compact-list">
              {analysis.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          {/* 右列：后续运行时间 */}
          <article className="detail-card">
            <h3>未来 5 次运行时间预测</h3>
            <ol className="compact-list">
              {analysis.nextRuns.length > 0 ? (
                analysis.nextRuns.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>未来一年内未匹配</li>
              )}
            </ol>
          </article>
        </div>

        {/* 定时指令生成面板：移出双列布局，采用 100% 宽度铺满 */}
        <article className="detail-card" style={{ display: "flex", flexDirection: "column", marginTop: "20px" }}>
          <h3>定时任务配置与定时命令生成</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <label className="tool-field">
              <span>待定时执行的命令行 (Command)</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="例如 /usr/local/bin/backup.sh"
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label className="tool-field">
                <span>标准输出 & 错误重定向策略</span>
                <select value={logPolicy} onChange={(e) => setLogPolicy(e.target.value)}>
                  <option value=">> /var/log/cronjob.log 2>&1">追加记录所有输出 (stdout & stderr)</option>
                  <option value="> /var/log/cronjob.log 2>&1">覆盖记录所有输出 (stdout & stderr)</option>
                  <option value="> /dev/null 2>&1">完全静默 (丢弃 stdout 与 stderr)</option>
                  <option value="> /dev/null 2>> /var/log/cronjob.err">仅记录错误输出 (忽略 stdout)</option>
                  <option value="">不作任何重定向 (依赖系统 Mail 送信给用户)</option>
                </select>
              </label>
              <label className="tool-field">
                <span>Systemd 定时器标识名称 (Service/Timer Unit Name)</span>
                <input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="my-backup"
                />
              </label>
            </div>

            {/* 定时命令面板 Tabs */}
            <div style={{ marginTop: "10px" }}>
              <div className="command-tabs">
                <button
                  type="button"
                  className={`command-tab-btn ${activeTab === "crontab" ? "active" : ""}`}
                  onClick={() => setActiveTab("crontab")}
                >
                  Crontab 定时条目命令
                </button>
                <button
                  type="button"
                  className={`command-tab-btn ${activeTab === "systemd_service" ? "active" : ""}`}
                  onClick={() => setActiveTab("systemd_service")}
                >
                  Systemd Service 单元配置
                </button>
                <button
                  type="button"
                  className={`command-tab-btn ${activeTab === "systemd_timer" ? "active" : ""}`}
                  onClick={() => setActiveTab("systemd_timer")}
                >
                  Systemd Timer 定时器配置
                </button>
              </div>

              <div className="output-box-container">
                {activeTab === "crontab" && (
                  <>
                    <button
                      type="button"
                      className="copy-overlay-btn"
                      onClick={() => void copyConfig(crontabCommand)}
                    >
                      {copied ? "已复制" : "复制 Crontab 条目"}
                    </button>
                    <textarea
                      readOnly
                      value={crontabCommand}
                      style={{ minHeight: "80px", fontFamily: "var(--font-mono)", fontSize: "14px", padding: "12px", width: "100%" }}
                    />
                    <div className="guide-box">
                      <strong>如何使用：</strong>输入 <code>crontab -e</code> 编辑定时任务，将上面这一行内容复制粘贴到文件最下方保存即可。
                    </div>
                  </>
                )}

                {activeTab === "systemd_service" && (
                  <>
                    <button
                      type="button"
                      className="copy-overlay-btn"
                      onClick={() => void copyConfig(systemdService)}
                    >
                      {copied ? "已复制" : "复制 Service 配置"}
                    </button>
                    <textarea
                      readOnly
                      value={systemdService}
                      style={{ minHeight: "180px", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.5", padding: "12px", width: "100%" }}
                    />
                    <div className="guide-box">
                      <strong>存放路径：</strong>将此配置文件内容保存到文件 <code>/etc/systemd/system/{serviceName}.service</code>
                    </div>
                  </>
                )}

                {activeTab === "systemd_timer" && (
                  <>
                    <button
                      type="button"
                      className="copy-overlay-btn"
                      onClick={() => void copyConfig(systemdTimer)}
                    >
                      {copied ? "已复制" : "复制 Timer 配置"}
                    </button>
                    <textarea
                      readOnly
                      value={systemdTimer}
                      style={{ minHeight: "180px", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.5", padding: "12px", width: "100%" }}
                    />
                    <div className="guide-box">
                      <strong>存放路径：</strong>将此配置文件内容保存到文件 <code>/etc/systemd/system/{serviceName}.timer</code>
                      <br />
                      <strong>激活运行：</strong><code>sudo systemctl daemon-reload && sudo systemctl enable --now {serviceName}.timer</code>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </article>

        <p className="tool-note">支持数字、逗号、范围、星号和步长语法，例如 0,30、9-18、*/15。</p>
        {error ? <p className="tool-error">{error}</p> : null}
      </div>
    </section>
  );
}
