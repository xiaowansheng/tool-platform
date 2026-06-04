"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleSubjects = `量子力学基础概念
英语高考核心 3500 词 - Unit 1
Python 异步编程与多线程
React 19 Concurrent Features
数据结构 - 红黑树与 B 树`;

export default function SpacedRepetitionPlanner({ manifest }: ToolAppProps) {
  const [subjectsText, setSubjectsText] = useState(sampleSubjects);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [algo, setAlgo] = useState<"ebbinghaus" | "sm2" | "custom">("ebbinghaus");
  const [customIntervals, setCustomIntervals] = useState("1, 2, 4, 7, 15, 30");

  const parsedIntervals = useMemo(() => {
    if (algo === "ebbinghaus") {
      return [1, 2, 4, 7, 15, 30];
    } else if (algo === "sm2") {
      // Projected SM-2 assuming standard grade of 4 (Good)
      // EF starts at 2.5. Good grade keeps EF stable.
      // Intervals: 1, 6, 15, 37, 92 days
      return [1, 6, 15, 37, 90];
    } else {
      return customIntervals
        .split(",")
        .map((x) => parseInt(x.trim()))
        .filter((x) => !isNaN(x) && x > 0)
        .sort((a, b) => a - b);
    }
  }, [algo, customIntervals]);

  const schedule = useMemo(() => {
    const subjects = subjectsText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subjects.length === 0) return [];

    const baseDate = new Date(startDate + "T00:00:00");
    const agenda: { dateStr: string; date: Date; subject: string; type: "study" | "review"; round?: number }[] = [];

    subjects.forEach((subject) => {
      // Day 0: Initial Study
      agenda.push({
        dateStr: startDate,
        date: new Date(baseDate),
        subject,
        type: "study"
      });

      // Review cycles
      parsedIntervals.forEach((days, round) => {
        const reviewDate = new Date(baseDate);
        reviewDate.setDate(reviewDate.getDate() + days);

        const yStr = reviewDate.getFullYear();
        const mStr = String(reviewDate.getMonth() + 1).padStart(2, "0");
        const dStr = String(reviewDate.getDate()).padStart(2, "0");

        agenda.push({
          dateStr: `${yStr}-${mStr}-${dStr}`,
          date: reviewDate,
          subject,
          type: "review",
          round: round + 1
        });
      });
    });

    // Sort by date, then type ("study" first), then subject
    return agenda.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.type !== b.type) return a.type === "study" ? -1 : 1;
      return a.subject.localeCompare(b.subject);
    });
  }, [subjectsText, startDate, parsedIntervals]);

  const agendaGroupedByDate = useMemo(() => {
    const grouped: Record<string, typeof schedule> = {};
    schedule.forEach((item) => {
      if (!grouped[item.dateStr]) {
        grouped[item.dateStr] = [];
      }
      grouped[item.dateStr].push(item);
    });
    return Object.entries(grouped).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [schedule]);

  // Generate iCalendar (.ics) format file
  const handleExportICS = () => {
    if (schedule.length === 0) return;

    const formatDateICS = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}${m}${d}`;
    };

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ToolPlatform//SpacedRepetitionPlanner//CN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    schedule.forEach((item, idx) => {
      const startStr = formatDateICS(item.date);
      // Event lasts 1 day
      const nextDate = new Date(item.date);
      nextDate.setDate(nextDate.getDate() + 1);
      const endStr = formatDateICS(nextDate);

      const title = item.type === "study" ? `学习: ${item.subject}` : `复习第${item.round}阶段: ${item.subject}`;

      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:spaced-rep-${idx}-${startStr}@tool-platform.com`);
      icsLines.push(`DTSTAMP:${formatDateICS(new Date())}T000000Z`);
      icsLines.push(`DTSTART;VALUE=DATE:${startStr}`);
      icsLines.push(`DTEND;VALUE=DATE:${endStr}`);
      icsLines.push(`SUMMARY:${title}`);
      icsLines.push(`DESCRIPTION:根据间隔重复规划器的学习与记忆曲线提醒。`);
      icsLines.push("STATUS:CONFIRMED");
      icsLines.push("TRANSP:TRANSPARENT");
      icsLines.push("END:VEVENT");
    });

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spaced-repetition-schedule.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">学习工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column" style={{ gap: "24px" }}>
        {/* Left Column: Form Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="tool-field" style={{ flex: 1 }}>
            <span>待学主题/清单 (每行一个)</span>
            <textarea
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              style={{ minHeight: "180px", fontSize: "14px" }}
              placeholder="请输入您计划学习的概念、科目或单词组..."
            />
          </label>

          <label className="tool-field">
            <span>开始学习日期</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>

          <label className="tool-field">
            <span>遗忘复习算法</span>
            <select value={algo} onChange={(e) => setAlgo(e.target.value as any)}>
              <option value="ebbinghaus">艾宾浩斯遗忘曲线 (1, 2, 4, 7, 15, 30天)</option>
              <option value="sm2">SM-2 经典算法预测 (1, 6, 15, 37, 90天)</option>
              <option value="custom">自定义复习间隔天数</option>
            </select>
          </label>

          {algo === "custom" && (
            <label className="tool-field">
              <span>自定义间隔天数 (逗号分隔)</span>
              <input
                type="text"
                value={customIntervals}
                onChange={(e) => setCustomIntervals(e.target.value)}
                placeholder="例如: 1, 3, 5, 8, 14, 30"
              />
            </label>
          )}

          <div style={{ marginTop: "10px" }}>
            <button
              type="button"
              className="button--primary"
              onClick={handleExportICS}
              disabled={schedule.length === 0}
              style={{ width: "100%", padding: "10px" }}
            >
              🗓️ 导出为手机/电脑日历文件 (.ics)
            </button>
          </div>
        </div>

        {/* Right Column: Calculated Schedule Agenda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>学习规划日程表</h3>

          {agendaGroupedByDate.length > 0 ? (
            <div
              style={{
                maxHeight: "450px",
                overflowY: "auto",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "var(--background-card, #fcfcfc)"
              }}
            >
              {agendaGroupedByDate.map(([dateStr, items]) => {
                const dayOfWeek = new Date(dateStr + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "long" });
                return (
                  <div key={dateStr} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "12px" }}>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, color: "#1e3a8a" }}>
                      📅 {dateStr} ({dayOfWeek})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            backgroundColor: "rgba(0,0,0,0.02)",
                            padding: "6px 10px",
                            borderRadius: "4px"
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#fff",
                              backgroundColor: item.type === "study" ? "#10b981" : "#3b82f6"
                            }}
                          >
                            {item.type === "study" ? "初次学习" : `复习 R${item.round}`}
                          </span>
                          <span style={{ fontWeight: 500 }}>{item.subject}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ opacity: 0.6, fontSize: "14px", fontStyle: "italic", textAlign: "center", paddingTop: "50px" }}>
              请输入待学清单后在日程表中查看学习规划日程。
            </p>
          )}
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="detail-grid" style={{ marginTop: "24px" }}>
          <article className="detail-card">
            <h3>核心学习主题</h3>
            <p>{subjectsText.split("\n").filter((s) => s.trim().length > 0).length} 个</p>
          </article>
          <article className="detail-card">
            <h3>总日程任务量</h3>
            <p>{schedule.length} 项</p>
          </article>
          <article className="detail-card">
            <h3>最远规划天数</h3>
            <p>{parsedIntervals[parsedIntervals.length - 1]} 天后</p>
          </article>
        </div>
      )}
    </section>
  );
}
