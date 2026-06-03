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
  const [analysis, setAnalysis] = useState<CronAnalysis>(() => {
    try {
      return analyzeCron("*/15 9-17 * * 1-5");
    } catch {
      return { summary: [], nextRuns: [] };
    }
  });
  const [error, setError] = useState("");

  // 定时任务指令生成状态
  const [command, setCommand] = useState("/usr/local/bin/backup.sh");
  const [logPolicy, setLogPolicy] = useState(">> /var/log/myjob.log 2>&1");
  const [serviceName, setServiceName] = useState("my-backup");
  const [activeTab, setActiveTab] = useState<"crontab" | "systemd_service" | "systemd_timer">("crontab");
  const [copied, setCopied] = useState(false);

  // Trigger analysis update when expression changes
  useEffect(() => {
    try {
      setAnalysis(analyzeCron(expression));
      setError("");
    } catch {
      // Keep previous analysis on edit error
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

  return (
    <section className="tool-panel">
      <style>{`
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
          transition: all 0.2s;
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
        {/* 基础表达式输入 */}
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

        <div className="tool-toolbar">
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

        <div className="workspace workspace--two-column" style={{ padding: 0 }}>
          {/* 左列：解析详情 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <article className="detail-card" style={{ flex: 1 }}>
              <h3>字段解释</h3>
              <ul className="compact-list">
                {analysis.summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="detail-card" style={{ flex: 1 }}>
              <h3>后续运行时间</h3>
              <ol className="compact-list">
                {analysis.nextRuns.length > 0 ? (
                  analysis.nextRuns.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>未来一年内未匹配</li>
                )}
              </ol>
            </article>
          </div>

          {/* 右列：定时命令生成面板 */}
          <article className="detail-card" style={{ display: "flex", flexDirection: "column" }}>
            <h3>定时任务配置与定时命令生成</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <label className="tool-field">
                <span>执行命令 (Command)</span>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="例如 /usr/local/bin/backup.sh"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="tool-field">
                  <span>日志重定向策略</span>
                  <select value={logPolicy} onChange={(e) => setLogPolicy(e.target.value)}>
                    <option value=">> /var/log/cronjob.log 2>&1">追加记录 stdout & stderr</option>
                    <option value="> /var/log/cronjob.log 2>&1">覆盖记录 stdout & stderr</option>
                    <option value="> /dev/null 2>&1">丢弃所有输出 (静默)</option>
                    <option value="> /dev/null 2>> /var/log/cronjob.err">仅记录错误输出</option>
                    <option value="">不重定向 (依赖系统Mail)</option>
                  </select>
                </label>
                <label className="tool-field">
                  <span>Systemd 单元名称</span>
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="my-backup"
                  />
                </label>
              </div>

              {/* 选项卡 */}
              <div style={{ marginTop: "10px" }}>
                <div className="command-tabs">
                  <button
                    type="button"
                    className={`command-tab-btn ${activeTab === "crontab" ? "active" : ""}`}
                    onClick={() => setActiveTab("crontab")}
                  >
                    Crontab 命令行
                  </button>
                  <button
                    type="button"
                    className={`command-tab-btn ${activeTab === "systemd_service" ? "active" : ""}`}
                    onClick={() => setActiveTab("systemd_service")}
                  >
                    Systemd Service
                  </button>
                  <button
                    type="button"
                    className={`command-tab-btn ${activeTab === "systemd_timer" ? "active" : ""}`}
                    onClick={() => setActiveTab("systemd_timer")}
                  >
                    Systemd Timer
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
                        {copied ? "已复制" : "复制命令"}
                      </button>
                      <textarea
                        readOnly
                        value={crontabCommand}
                        style={{ minHeight: "80px", fontFamily: "var(--font-mono)", fontSize: "13px" }}
                      />
                      <div className="guide-box">
                        提示：使用命令 <code>crontab -e</code> 将以上单行指令粘贴在底端即可保存生效。
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
                        {copied ? "已复制" : "复制配置"}
                      </button>
                      <textarea
                        readOnly
                        value={systemdService}
                        style={{ minHeight: "150px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: "1.4" }}
                      />
                      <div className="guide-box">
                        路径：保存至 <code>/etc/systemd/system/{serviceName}.service</code>
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
                        {copied ? "已复制" : "复制配置"}
                      </button>
                      <textarea
                        readOnly
                        value={systemdTimer}
                        style={{ minHeight: "150px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: "1.4" }}
                      />
                      <div className="guide-box">
                        路径：保存至 <code>/etc/systemd/system/{serviceName}.timer</code>
                        <br />
                        启用：<code>sudo systemctl daemon-reload && sudo systemctl enable --now {serviceName}.timer</code>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>

        <p className="tool-note">支持数字、逗号、范围、星号和步长语法，例如 0,30、9-18、*/15。</p>
        {error ? <p className="tool-error">{error}</p> : null}
      </div>
    </section>
  );
}
