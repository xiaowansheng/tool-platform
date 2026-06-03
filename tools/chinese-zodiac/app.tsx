"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ZodiacInfo {
  name: string;
  emoji: string;
  element: string;
  elementEmoji: string;
  yinYang: string;
  traits: string[];
  strengths: string[];
  weaknesses: string[];
  luckyNumbers: number[];
  luckyColors: string[];
  compatibleWith: string[];
  description: string;
}

const ZODIACS: ZodiacInfo[] = [
  {
    name: "鼠",
    emoji: "🐭",
    element: "水",
    elementEmoji: "💧",
    yinYang: "阳",
    traits: ["机智", "灵活", "好奇", "敏锐"],
    strengths: ["适应力强", "充满创意", "社交能力出众"],
    weaknesses: ["有时过于谨慎", "容易焦虑", "缺乏勇气"],
    luckyNumbers: [2, 3],
    luckyColors: ["蓝色", "金色", "绿色"],
    compatibleWith: ["牛", "龙", "猴"],
    description: "鼠年出生的人天资聪颖、活力充沛，善于把握机会。他们富有魅力，广结人缘，但有时过于计较得失。",
  },
  {
    name: "牛",
    emoji: "🐮",
    element: "土",
    elementEmoji: "🌍",
    yinYang: "阴",
    traits: ["勤劳", "可靠", "耐心", "踏实"],
    strengths: ["意志坚定", "诚实守信", "吃苦耐劳"],
    weaknesses: ["固执己见", "不善言辞", "不易接受新事物"],
    luckyNumbers: [1, 4],
    luckyColors: ["白色", "黄色", "绿色"],
    compatibleWith: ["鼠", "蛇", "鸡"],
    description: "牛年出生的人勤勉踏实、意志坚定，是最可靠的朋友和合作伙伴。他们不喜欢走捷径，靠着一步一个脚印实现目标。",
  },
  {
    name: "虎",
    emoji: "🐯",
    element: "木",
    elementEmoji: "🌳",
    yinYang: "阳",
    traits: ["勇敢", "自信", "竞争", "热情"],
    strengths: ["天生领袖", "勇于冒险", "正义感强"],
    weaknesses: ["鲁莽冲动", "固执强硬", "容易骄傲"],
    luckyNumbers: [1, 3, 4],
    luckyColors: ["蓝色", "灰色", "橙色"],
    compatibleWith: ["马", "狗"],
    description: "虎年出生的人个性鲜明、充满魄力，天生具有领导气质。他们勇于挑战权威，热爱自由，但有时难以控制情绪。",
  },
  {
    name: "兔",
    emoji: "🐰",
    element: "木",
    elementEmoji: "🌳",
    yinYang: "阴",
    traits: ["温和", "优雅", "谨慎", "敏感"],
    strengths: ["善解人意", "艺术天赋", "和平主义者"],
    weaknesses: ["优柔寡断", "逃避冲突", "容易情绪化"],
    luckyNumbers: [3, 4, 6],
    luckyColors: ["红色", "粉色", "紫色"],
    compatibleWith: ["羊", "狗", "猪"],
    description: "兔年出生的人温文尔雅、心思细腻，给人一种优雅和善的感觉。他们重视家庭和谐，有强烈的审美意识。",
  },
  {
    name: "龙",
    emoji: "🐲",
    element: "土",
    elementEmoji: "🌍",
    yinYang: "阳",
    traits: ["威严", "自信", "进取", "慷慨"],
    strengths: ["魅力四射", "雄心勃勃", "天赋异禀"],
    weaknesses: ["自我中心", "脾气暴躁", "不切实际"],
    luckyNumbers: [1, 6, 7],
    luckyColors: ["金色", "银色", "灰色"],
    compatibleWith: ["鼠", "猴", "鸡"],
    description: "龙年出生的人是十二生肖中最具传奇色彩的，他们充满力量与热情，天生不凡，往往能在各行各业取得卓越成就。",
  },
  {
    name: "蛇",
    emoji: "🐍",
    element: "火",
    elementEmoji: "🔥",
    yinYang: "阴",
    traits: ["智慧", "神秘", "直觉", "优雅"],
    strengths: ["洞察力强", "哲学思维", "品味出众"],
    weaknesses: ["多疑敏感", "记仇", "嫉妒心强"],
    luckyNumbers: [2, 8, 9],
    luckyColors: ["黑色", "红色", "黄色"],
    compatibleWith: ["牛", "鸡"],
    description: "蛇年出生的人深思熟虑、神秘优雅，拥有出色的直觉和智慧。他们不轻易表达内心，但一旦确定目标便坚定执行。",
  },
  {
    name: "马",
    emoji: "🐴",
    element: "火",
    elementEmoji: "🔥",
    yinYang: "阳",
    traits: ["奔放", "活力", "独立", "乐观"],
    strengths: ["精力充沛", "热爱自由", "才思敏捷"],
    weaknesses: ["缺乏耐心", "粗心大意", "难以坚持"],
    luckyNumbers: [2, 3, 7],
    luckyColors: ["黄色", "绿色"],
    compatibleWith: ["虎", "羊", "兔"],
    description: "马年出生的人热情奔放、充满活力，对自由有着强烈渴望。他们善于交际，在人群中总是那个最耀眼的存在。",
  },
  {
    name: "羊",
    emoji: "🐑",
    element: "土",
    elementEmoji: "🌍",
    yinYang: "阴",
    traits: ["温柔", "善良", "富有创意", "随和"],
    strengths: ["富有同情心", "艺术天分", "待人诚恳"],
    weaknesses: ["依赖性强", "优柔寡断", "悲观"],
    luckyNumbers: [2, 7],
    luckyColors: ["棕色", "红色", "紫色"],
    compatibleWith: ["兔", "马", "猪"],
    description: "羊年出生的人心地善良、温柔体贴，对美的事物有着天然的敏感。他们富有创造力，常在艺术、文学领域有所建树。",
  },
  {
    name: "猴",
    emoji: "🐵",
    element: "金",
    elementEmoji: "⚙️",
    yinYang: "阳",
    traits: ["聪明", "幽默", "机灵", "好奇"],
    strengths: ["解决问题能力强", "适应力超强", "创新思维"],
    weaknesses: ["不够踏实", "过于好胜", "容易分心"],
    luckyNumbers: [4, 9],
    luckyColors: ["白色", "蓝色", "金色"],
    compatibleWith: ["鼠", "龙"],
    description: "猴年出生的人才智过人、机灵活泼，是十二生肖中最富机智的。他们思维跳跃，总能找到别人看不到的解决之道。",
  },
  {
    name: "鸡",
    emoji: "🐔",
    element: "金",
    elementEmoji: "⚙️",
    yinYang: "阴",
    traits: ["勤奋", "自信", "细心", "直率"],
    strengths: ["组织能力强", "注重细节", "精准观察"],
    weaknesses: ["过于挑剔", "自以为是", "固执"],
    luckyNumbers: [5, 7, 8],
    luckyColors: ["金色", "棕色", "黄色"],
    compatibleWith: ["牛", "龙", "蛇"],
    description: "鸡年出生的人勤奋踏实、精打细算，对工作极度认真负责。他们观察力敏锐，能发现常人忽略的细节。",
  },
  {
    name: "狗",
    emoji: "🐶",
    element: "土",
    elementEmoji: "🌍",
    yinYang: "阳",
    traits: ["忠诚", "诚实", "善良", "谨慎"],
    strengths: ["值得信赖", "正义感强", "保护欲强"],
    weaknesses: ["过于担忧", "固执己见", "情绪化"],
    luckyNumbers: [3, 4, 9],
    luckyColors: ["绿色", "红色", "紫色"],
    compatibleWith: ["虎", "兔", "马"],
    description: "狗年出生的人忠诚善良、正直诚信，是最值得信赖的朋友。他们有强烈的正义感，面对不公平时会挺身而出。",
  },
  {
    name: "猪",
    emoji: "🐷",
    element: "水",
    elementEmoji: "💧",
    yinYang: "阴",
    traits: ["善良", "慷慨", "诚实", "乐观"],
    strengths: ["宽厚仁慈", "待人真诚", "享受生活"],
    weaknesses: ["轻信他人", "贪图享乐", "不够进取"],
    luckyNumbers: [2, 5, 8],
    luckyColors: ["黄色", "灰色", "棕色"],
    compatibleWith: ["兔", "羊"],
    description: "猪年出生的人心地纯良、慷慨大方，对生活充满热情。他们不计较得失，总是以最善意的方式看待他人。",
  },
];

// Zodiac index: 1900 is 鼠 (index 0)
function getZodiacIndex(year: number): number {
  return ((year - 1900) % 12 + 12) % 12;
}

// Chinese Heavenly Stems + Earthly Branches for year
const HEAVENLY_STEMS = ["庚", "辛", "壬", "癸", "甲", "乙", "丙", "丁", "戊", "己"];
const EARTHLY_BRANCHES = ["申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未"];

function getGanZhi(year: number): string {
  const stem = HEAVENLY_STEMS[((year - 1900) % 10 + 10) % 10];
  const branch = EARTHLY_BRANCHES[((year - 1900) % 12 + 12) % 12];
  return `${stem}${branch}年`;
}

export default function ChineseZodiacTool({ manifest }: ToolAppProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacInfo | null>(null);

  const zodiacIndex = getZodiacIndex(year);
  const zodiac = ZODIACS[zodiacIndex];
  const ganZhi = getGanZhi(year);

  // Years in range 1924–2043 that match this zodiac
  const sameZodiacYears: number[] = [];
  for (let y = 1924; y <= 2043; y++) {
    if (getZodiacIndex(y) === zodiacIndex) sameZodiacYears.push(y);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">传统文化</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Year Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div className="tool-field" style={{ gap: "0.25rem", flex: "0 0 auto" }}>
          <span>出生年份</span>
          <input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ background: "var(--bg-base)", width: "120px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
            <button
              key={y}
              type="button"
              className={year === y ? "button--primary" : "button--secondary"}
              style={{ fontSize: "0.78rem", padding: "0.2rem 0.6rem" }}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>干支纪年</div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>{ganZhi}</div>
        </div>
      </div>

      {/* Main Result Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "1.5rem",
          background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(251,146,60,0.06))",
          border: "1px solid rgba(220,38,38,0.15)",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          alignItems: "start",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "5rem", lineHeight: 1 }}>{zodiac.emoji}</div>
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            {zodiac.name}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
            {zodiac.elementEmoji} {zodiac.element}行 · {zodiac.yinYang}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{zodiac.description}</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {zodiac.traits.map((t) => (
              <span
                key={t}
                style={{
                  background: "rgba(220,38,38,0.1)",
                  color: "#dc2626",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "0.3rem" }}>✅ 优势</div>
              {zodiac.strengths.map((s) => (
                <div key={s} style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "0.15rem" }}>
                  · {s}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "0.3rem" }}>⚠ 劣势</div>
              {zodiac.weaknesses.map((w) => (
                <div key={w} style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "0.15rem" }}>
                  · {w}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>幸运数字</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{zodiac.luckyNumbers.join("、")}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>幸运颜色</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{zodiac.luckyColors.join("、")}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>最佳配对</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {zodiac.compatibleWith.map((z) => {
                  const info = ZODIACS.find((x) => x.name === z);
                  return info ? `${info.emoji}${z}` : z;
                }).join(" ")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Same zodiac years */}
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
          近现代同属「{zodiac.name}」年份（1924–2043）
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {sameZodiacYears.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              style={{
                background: y === year ? "rgba(220,38,38,0.15)" : "var(--bg-muted)",
                border: `1px solid ${y === year ? "rgba(220,38,38,0.4)" : "var(--border)"}`,
                color: y === year ? "#dc2626" : "var(--text-secondary)",
                borderRadius: "6px",
                padding: "0.2rem 0.55rem",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontWeight: y === year ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* All 12 Zodiacs browser */}
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
          十二生肖速览
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {ZODIACS.map((z, i) => {
            const isActive = zodiacIndex === i;
            return (
              <button
                key={z.name}
                type="button"
                onClick={() => setSelectedZodiac(selectedZodiac?.name === z.name ? null : z)}
                title={z.name}
                style={{
                  background: isActive
                    ? "rgba(220,38,38,0.12)"
                    : "var(--bg-muted)",
                  border: `1px solid ${isActive ? "rgba(220,38,38,0.35)" : "var(--border)"}`,
                  borderRadius: "10px",
                  padding: "0.6rem 0.4rem",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                  transition: "all 0.15s",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span style={{ fontSize: "1.6rem" }}>{z.emoji}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: isActive ? 700 : 400, color: isActive ? "#dc2626" : "var(--text-secondary)" }}>
                  {z.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail popup for selected zodiac */}
      {selectedZodiac && selectedZodiac.name !== zodiac.name && (
        <div
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            gap: "1.25rem",
            alignItems: "flex-start",
          }}
        >
          <div style={{ fontSize: "2.5rem" }}>{selectedZodiac.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
              {selectedZodiac.name} · {selectedZodiac.elementEmoji} {selectedZodiac.element}行
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0.4rem 0" }}>
              {selectedZodiac.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {selectedZodiac.traits.map((t) => (
                <span
                  key={t}
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="button--secondary"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", flexShrink: 0 }}
            onClick={() => setSelectedZodiac(null)}
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
