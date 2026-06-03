"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function AgeCalculator({ manifest }: ToolAppProps) {
  const [birthDate, setBirthDate] = useState("1990-06-15");

  const result = useMemo(() => {
    const birth = new Date(birthDate + "T00:00:00");
    const now = new Date();

    if (isNaN(birth.getTime()) || birth > now) return null;

    // Exact age
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    // Total days alive
    const diffMs = now.getTime() - birth.getTime();
    const totalDays = Math.floor(diffMs / 86_400_000);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;

    // Next birthday countdown
    const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    const nextBday = thisYearBday > now ? thisYearBday : new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());
    const daysUntilBday = Math.ceil((nextBday.getTime() - now.getTime()) / 86_400_000);

    // Zodiac sign
    const month = birth.getMonth() + 1;
    const day = birth.getDate();
    const zodiac = getZodiac(month, day);

    // Day of week born
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const bornWeekday = weekdays[birth.getDay()];

    return {
      years, months, days,
      totalDays, totalWeeks, totalMonths,
      daysUntilBday, nextBday: nextBday.toLocaleDateString("zh-CN"),
      zodiac, bornWeekday
    };
  }, [birthDate]);

  function getZodiac(month: number, day: number) {
    const signs = [
      { name: "摩羯座", from: [1, 1], to: [1, 19] },
      { name: "水瓶座", from: [1, 20], to: [2, 18] },
      { name: "双鱼座", from: [2, 19], to: [3, 20] },
      { name: "白羊座", from: [3, 21], to: [4, 19] },
      { name: "金牛座", from: [4, 20], to: [5, 20] },
      { name: "双子座", from: [5, 21], to: [6, 21] },
      { name: "巨蟹座", from: [6, 22], to: [7, 22] },
      { name: "狮子座", from: [7, 23], to: [8, 22] },
      { name: "处女座", from: [8, 23], to: [9, 22] },
      { name: "天秤座", from: [9, 23], to: [10, 23] },
      { name: "天蝎座", from: [10, 24], to: [11, 22] },
      { name: "射手座", from: [11, 23], to: [12, 21] },
      { name: "摩羯座", from: [12, 22], to: [12, 31] }
    ];
    for (const s of signs) {
      if (
        (month === s.from[0] && day >= s.from[1]) ||
        (month === s.to[0] && day <= s.to[1])
      ) {
        return s.name;
      }
    }
    return "未知";
  }

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
          <span>出生日期</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
      </div>

      {result && (
        <>
          <div className="detail-grid">
            <article className="detail-card" style={{ gridColumn: "1 / -1" }}>
              <h3>精确年龄</h3>
              <p style={{ fontSize: 28, fontWeight: 700 }}>
                {result.years} 岁 {result.months} 个月 {result.days} 天
              </p>
            </article>
          </div>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>总天数</h3>
              <p>{result.totalDays.toLocaleString()} 天</p>
            </article>
            <article className="detail-card">
              <h3>总周数</h3>
              <p>{result.totalWeeks.toLocaleString()} 周</p>
            </article>
            <article className="detail-card">
              <h3>总月数</h3>
              <p>{result.totalMonths} 月</p>
            </article>
            <article className="detail-card">
              <h3>出生日</h3>
              <p>{result.bornWeekday}</p>
            </article>
            <article className="detail-card">
              <h3>星座</h3>
              <p>{result.zodiac}</p>
            </article>
            <article className="detail-card">
              <h3>距下个生日</h3>
              <p>
                {result.daysUntilBday === 0
                  ? "今天是你的生日! 🎂"
                  : `${result.daysUntilBday} 天 (${result.nextBday})`}
              </p>
            </article>
          </div>
        </>
      )}

      {!result && birthDate && (
        <p style={{ textAlign: "center", opacity: 0.6, padding: 16 }}>
          请输入有效的出生日期
        </p>
      )}
    </section>
  );
}
