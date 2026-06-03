"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ZodiacInfo {
  name: string;
  enName: string;
  symbol: string;
  dateRange: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  elementZh: string;
  rulingPlanet: string;
  rulingPlanetZh: string;
  strengths: string[];
  weaknesses: string[];
  luckyNumber: number;
  luckyColor: string;
  luckyFlower: string;
  compatibility: string[];
  description: string;
}

const ZODIAC_DATA: Record<string, ZodiacInfo> = {
  Aries: {
    name: "白羊座",
    enName: "Aries",
    symbol: "♈",
    dateRange: "3月21日 - 4月19日",
    element: "Fire",
    elementZh: "火象星座",
    rulingPlanet: "Mars",
    rulingPlanetZh: "火星",
    strengths: ["热情", "勇敢", "诚实", "有活力", "富有冒险精神"],
    weaknesses: ["急躁", "冲动", "缺乏耐心", "自我中心"],
    luckyNumber: 9,
    luckyColor: "鲜红色",
    luckyFlower: "雏菊",
    compatibility: ["狮子座", "射手座", "双子座"],
    description: "白羊座代表着新的开始。他们精力充沛、斗志昂扬，具有强大的行动力。他们性格直爽，喜欢挑战，并且从不畏惧困难。然而，他们需要注意克制自己的急躁情绪，学会在行动前深思熟虑。"
  },
  Taurus: {
    name: "金牛座",
    enName: "Taurus",
    symbol: "♉",
    dateRange: "4月20日 - 5月20日",
    element: "Earth",
    elementZh: "土象星座",
    rulingPlanet: "Venus",
    rulingPlanetZh: "金星",
    strengths: ["可靠", "耐心", "务实", "艺术天赋", "忠诚"],
    weaknesses: ["固执", "占有欲强", "缺乏变通", "过于保守"],
    luckyNumber: 6,
    luckyColor: "翠绿色",
    luckyFlower: "玫瑰",
    compatibility: ["处女座", "摩羯座", "巨蟹座"],
    description: "金牛座追求稳定与安全感。他们脚踏实地，做事稳健，对物质享受和美感有很强的鉴赏力。金牛座非常值得信赖，一旦下定决心，就会持之以恒。但过于倔强的性格有时会让周围人感到无奈。"
  },
  Gemini: {
    name: "双子座",
    enName: "Gemini",
    symbol: "♊",
    dateRange: "5月21日 - 6月21日",
    element: "Air",
    elementZh: "风象星座",
    rulingPlanet: "Mercury",
    rulingPlanetZh: "水星",
    strengths: ["机智", "适应力强", "好奇心强", "善于沟通", "多才多艺"],
    weaknesses: ["善变", "三分钟热度", "缺乏专注", "过于敏感"],
    luckyNumber: 5,
    luckyColor: "明黄色",
    luckyFlower: "薰衣草",
    compatibility: ["天秤座", "水瓶座", "白羊座"],
    description: "双子座像一阵风，充满了好奇心与求知欲。他们聪明伶俐，善于社交，思维敏捷，总是走在资讯的最前端。然而，双子座也容易因为兴趣过于广泛而难以在某一件事情上坚持到底。"
  },
  Cancer: {
    name: "巨蟹座",
    enName: "Cancer",
    symbol: "♋",
    dateRange: "6月22日 - 7月22日",
    element: "Water",
    elementZh: "水象星座",
    rulingPlanet: "Moon",
    rulingPlanetZh: "月亮",
    strengths: ["温柔", "体贴", "直觉敏锐", "有同理心", "重感情"],
    weaknesses: ["情绪化", "敏感多疑", "缺乏安全感", "沉溺过去"],
    luckyNumber: 2,
    luckyColor: "银白色",
    luckyFlower: "百合",
    compatibility: ["天蝎座", "双鱼座", "金牛座"],
    description: "巨蟹座温和而富有同情心，具有强烈的保护欲。他们非常重视家庭与亲密关系，内心极其柔软。虽然外表可能有一层坚硬的壳，但其实很容易受伤，情绪波动也比较大。"
  },
  Leo: {
    name: "狮子座",
    enName: "Leo",
    symbol: "♌",
    dateRange: "7月23日 - 8月22日",
    element: "Fire",
    elementZh: "火象星座",
    rulingPlanet: "Sun",
    rulingPlanetZh: "太阳",
    strengths: ["自信", "大方", "有领导力", "忠诚", "热情奔放"],
    weaknesses: ["骄傲", "虚荣心强", "霸道", "不能容忍批评"],
    luckyNumber: 1,
    luckyColor: "金色",
    luckyFlower: "向日葵",
    compatibility: ["白羊座", "射手座", "天秤座"],
    description: "狮子座天生具有王者风范。他们慷慨大度，热情洋溢，渴望成为瞩目的焦点。他们有很强的领导能力，乐于助人，并且对自己充满信心。但要提防虚荣和主观专断带来的问题。"
  },
  Virgo: {
    name: "处女座",
    enName: "Virgo",
    symbol: "♍",
    dateRange: "8月23日 - 9月22日",
    element: "Earth",
    elementZh: "土象星座",
    rulingPlanet: "Mercury",
    rulingPlanetZh: "水星",
    strengths: ["严谨", "细心", "勤奋", "乐于助人", "分析力强"],
    weaknesses: ["挑剔", "完美主义", "爱唠叨", "容易焦虑"],
    luckyNumber: 5,
    luckyColor: "灰色",
    luckyFlower: "菊花",
    compatibility: ["金牛座", "摩羯座", "天蝎座"],
    description: "处女座是完美主义的代名词。他们细致入微，讲求秩序和效率，做事一丝不苟。他们善于理性分析，也是极其可靠的伙伴。不过，过度追求完美会让处女座容易陷入自我焦虑中。"
  },
  Libra: {
    name: "天秤座",
    enName: "Libra",
    symbol: "♎",
    dateRange: "9月23日 - 10月23日",
    element: "Air",
    elementZh: "风象星座",
    rulingPlanet: "Venus",
    rulingPlanetZh: "金星",
    strengths: ["优雅", "善于协调", "追求公平", "随和", "审美优异"],
    weaknesses: ["优柔寡断", "逃避冲突", "意志薄弱", "迎合他人"],
    luckyNumber: 7,
    luckyColor: "粉红色",
    luckyFlower: "大丽花",
    compatibility: ["双子座", "水瓶座", "狮子座"],
    description: "天秤座毕生追求平衡与和谐。他们天生具有外交手腕，言行优雅，注重人际关系的融洽。他们热爱美好的事物，具备极佳的审美眼光。但面对选择时，他们常常犹豫不决，难以做决定。"
  },
  Scorpio: {
    name: "天蝎座",
    enName: "Scorpio",
    symbol: "♏",
    dateRange: "10月24日 - 11月22日",
    element: "Water",
    elementZh: "水象星座",
    rulingPlanet: "Pluto",
    rulingPlanetZh: "冥王星",
    strengths: ["深思熟虑", "意志坚定", "直觉超群", "深情", "充满神秘感"],
    weaknesses: ["占有欲极强", "爱记仇", "多疑", "极端"],
    luckyNumber: 8,
    luckyColor: "深黑色",
    luckyFlower: "菊花",
    compatibility: ["巨蟹座", "双鱼座", "处女座"],
    description: "天蝎座深沉而神秘，内心充满了执着与热烈。他们有着极强的洞察力，一旦确立目标就会不折不扣地执行。在感情上他们专一深情，但占有欲和嫉妒心同样强烈，难以原谅背叛。"
  },
  Sagittarius: {
    name: "射手座",
    enName: "Sagittarius",
    symbol: "♐",
    dateRange: "11月23日 - 12月21日",
    element: "Fire",
    elementZh: "火象星座",
    rulingPlanet: "Jupiter",
    rulingPlanetZh: "木星",
    strengths: ["乐观", "追求自由", "慷慨", "幽默", "心胸开阔"],
    weaknesses: ["粗心", "盲目乐观", "缺乏毅力", "心直口快"],
    luckyNumber: 3,
    luckyColor: "紫色",
    luckyFlower: "康乃馨",
    compatibility: ["白羊座", "狮子座", "水瓶座"],
    description: "射手座是天生的旅行者。他们乐观开朗，热爱自由，对未知世界充满了探索欲望。他们心直口快，待人真诚，不喜欢受约束。然而，缺乏耐心和做事粗心是他们需要克服的毛病。"
  },
  Capricorn: {
    name: "摩羯座",
    enName: "Capricorn",
    symbol: "♑",
    dateRange: "12月22日 - 1月19日",
    element: "Earth",
    elementZh: "土象星座",
    rulingPlanet: "Saturn",
    rulingPlanetZh: "土星",
    strengths: ["有耐心", "责任感强", "务实", "纪律严明", "深谋远虑"],
    weaknesses: ["忧郁", "死板", "功利心强", "不善表达感情"],
    luckyNumber: 8,
    luckyColor: "深褐色",
    luckyFlower: "三色堇",
    compatibility: ["金牛座", "处女座", "双鱼座"],
    description: "摩羯座是十二星座中最有耐心和毅力的。他们性格沉稳，务实且极具野心，通常会默默耕耘以达成自己的宏伟目标。他们非常看重社会秩序和责任感，但也常常因为过于压抑感情而显得有些难以亲近。"
  },
  Aquarius: {
    name: "水瓶座",
    enName: "Aquarius",
    symbol: "♒",
    dateRange: "1月20日 - 2月18日",
    element: "Air",
    elementZh: "风象星座",
    rulingPlanet: "Uranus",
    rulingPlanetZh: "天王星",
    strengths: ["独立", "创意无限", "博爱", "求新立异", "理智"],
    weaknesses: ["冷漠", "叛逆", "不合群", "过于理想化"],
    luckyNumber: 4,
    luckyColor: "天蓝色",
    luckyFlower: "兰花",
    compatibility: ["双子座", "天秤座", "射手座"],
    description: "水瓶座充满了奇思妙想。他们追求独特的生活方式，特立独行，拥有超前的眼光和博爱精神。他们崇尚个人自由，逻辑思维能力强，但有些时候容易表现得冷漠或难以捉摸。"
  },
  Pisces: {
    name: "双鱼座",
    enName: "Pisces",
    symbol: "♓",
    dateRange: "2月19日 - 3月20日",
    element: "Water",
    elementZh: "水象星座",
    rulingPlanet: "Neptune",
    rulingPlanetZh: "海王星",
    strengths: ["浪漫", "富有想象力", "善良", "直觉强", "乐于牺牲"],
    weaknesses: ["爱幻想", "优柔孤立", "意志薄弱", "容易受影响"],
    luckyNumber: 3,
    luckyColor: "海蓝色",
    luckyFlower: "睡莲",
    compatibility: ["巨蟹座", "天蝎座", "摩羯座"],
    description: "双鱼座是十二星座的终结者，集合了所有星座的优缺点。他们温柔多情，极具艺术气息和同情心，生活在充满梦想的世界里。然而，他们也容易逃避现实，需要在纷杂的世界中学会坚定自我。"
  }
};

const ELEMENT_STYLES = {
  Fire: { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)", text: "#ef4444" },
  Earth: { bg: "rgba(139, 92, 26, 0.1)", border: "rgba(139, 92, 26, 0.2)", text: "#8b5c1a" },
  Air: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)", text: "#3b82f6" },
  Water: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)", text: "#10b981" }
};

export default function HoroscopeCalculatorTool({ manifest }: ToolAppProps) {
  const [birthDate, setBirthDate] = useState("1995-06-15");
  const [activeTab, setActiveTab] = useState<"fortune" | "personality" | "compatibility">("fortune");

  const selectedZodiacKey = useMemo(() => {
    const date = new Date(birthDate + "T00:00:00");
    if (isNaN(date.getTime())) return "Gemini";
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return "Gemini";
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return "Cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return "Libra";
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return "Scorpio";
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return "Sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
    return "Gemini";
  }, [birthDate]);

  const zodiacInfo = useMemo(() => ZODIAC_DATA[selectedZodiacKey], [selectedZodiacKey]);

  // Generate a deterministic fortune based on birthdate and current day
  const dailyFortune = useMemo(() => {
    const today = new Date().toDateString();
    // Simple hash function for seeding
    let seed = 0;
    const combinedStr = birthDate + today + selectedZodiacKey;
    for (let i = 0; i < combinedStr.length; i++) {
      seed = combinedStr.charCodeAt(i) + ((seed << 5) - seed);
    }
    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const loveScore = Math.floor(pseudoRandom(1) * 3) + 3; // 3 to 5 stars
    const careerScore = Math.floor(pseudoRandom(2) * 3) + 3;
    const financeScore = Math.floor(pseudoRandom(3) * 3) + 3;
    const healthScore = Math.floor(pseudoRandom(4) * 3) + 3;

    const loveTexts = [
      "今日桃花运不错，单身者适合参加社交聚会，可能会遇到投缘的异性；有伴侣者沟通甜蜜，彼此理解加深。",
      "感情运势平稳，多给彼此一些独立空间会让关系更健康。晚间适合一起看部电影，享受平静的陪伴。",
      "情绪稍显敏感，容易因为小细节与伴侣产生误会。保持耐心和倾听，不要急着下结论。"
    ];
    const careerTexts = [
      "工作上灵感迸发，非常适合解决长期积累的技术难题或开展头脑风暴，你的创意会得到同事赞许。",
      "做事细心沉稳，能够把复杂的事务理顺。今日工作效率颇高，但也别忘了适时休息，放松双眼。",
      "今日事务较多，可能需要协调多方资源。建议分清轻重缓急，避免多任务并进导致效率下降。"
    ];
    const financeTexts = [
      "财运极佳，可能会收到意料之外的小惊喜，或是之前的理财计划看到了好的回报。宜理性消费。",
      "财务状况安稳。今天适合做个人预算规划或学习理财知识，避免冲动下单一些华而不实的小物品。",
      "近期有额外开支的可能，可能是为了健康、学习或人情往来。适当节流，保持合理的现金流。"
    ];
    const healthTexts = [
      "身体能量充沛，元气满满。适合做一些中等强度的运动，如慢跑或游泳，能有效释放压力。",
      "健康运势良好，注意保持规律的作息。多喝水，适量补充新鲜蔬果，能让你一天都保持好状态。",
      "略感疲惫，可能是近期缺乏充足睡眠。今日宜早点休息，睡前可以泡脚或做些温和的拉伸运动。"
    ];

    const summaryTexts = [
      "今天是充满机遇与活力的一天，相信自己的直觉，大胆向前走吧！",
      "今天适合沉淀和规划，保持稳健的步伐比急于求成更为关键。",
      "今天有些小挑战，但也正是展现你随机应变能力的好时机，保持乐观！"
    ];

    return {
      loveScore,
      careerScore,
      financeScore,
      healthScore,
      loveText: loveTexts[Math.floor(pseudoRandom(5) * loveTexts.length)],
      careerText: careerTexts[Math.floor(pseudoRandom(6) * careerTexts.length)],
      financeText: financeTexts[Math.floor(pseudoRandom(7) * financeTexts.length)],
      healthText: healthTexts[Math.floor(pseudoRandom(8) * healthTexts.length)],
      summary: summaryTexts[Math.floor(pseudoRandom(9) * summaryTexts.length)],
      luckyColor: zodiacInfo.luckyColor,
      luckyNumber: ((Math.abs(seed) % 9) + 1).toString(),
      luckyDirection: ["东", "南", "西", "北", "东南", "东北", "西南", "西北"][Math.abs(seed) % 8]
    };
  }, [birthDate, selectedZodiacKey, zodiacInfo]);

  const elementStyle = ELEMENT_STYLES[zodiacInfo.element];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">趣味娱乐</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <label className="tool-field tool-field--compact" style={{ flex: 1, minWidth: "200px" }}>
          <span>选择出生日期</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: "8px", flex: 2, justifyContent: "flex-end" }}>
          {Object.keys(ZODIAC_DATA).slice(0, 6).map((k) => (
            <button
              key={k}
              type="button"
              className={`pill ${selectedZodiacKey === k ? "pill--selected" : ""}`}
              onClick={() => {
                // Find a date corresponding to that zodiac to update birthDate
                const mapping: Record<string, string> = {
                  Aries: "1995-03-25",
                  Taurus: "1995-04-25",
                  Gemini: "1995-05-25",
                  Cancer: "1995-06-25",
                  Leo: "1995-07-25",
                  Virgo: "1995-08-25"
                };
                setBirthDate(mapping[k]);
              }}
              style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ddd", borderRadius: "4px", background: "none", cursor: "pointer" }}
            >
              {ZODIAC_DATA[k].symbol} {ZODIAC_DATA[k].name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flex: 2, justifyContent: "flex-end" }}>
          {Object.keys(ZODIAC_DATA).slice(6).map((k) => (
            <button
              key={k}
              type="button"
              className={`pill ${selectedZodiacKey === k ? "pill--selected" : ""}`}
              onClick={() => {
                const mapping: Record<string, string> = {
                  Libra: "1995-09-25",
                  Scorpio: "1995-10-25",
                  Sagittarius: "1995-11-25",
                  Capricorn: "1995-12-25",
                  Aquarius: "1995-01-25",
                  Pisces: "1995-02-25"
                };
                setBirthDate(mapping[k]);
              }}
              style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ddd", borderRadius: "4px", background: "none", cursor: "pointer" }}
            >
              {ZODIAC_DATA[k].symbol} {ZODIAC_DATA[k].name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginTop: "24px" }} className="zodiac-layout">
        {/* Left Side: Zodiac Profile Card */}
        <article
          className="detail-card"
          style={{
            background: elementStyle.bg,
            border: `1px solid ${elementStyle.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <span style={{ fontSize: "72px", lineHeight: 1, margin: "16px 0", display: "block" }}>{zodiacInfo.symbol}</span>
          <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "8px 0 4px 0" }}>{zodiacInfo.name}</h3>
          <p style={{ opacity: 0.6, fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 16px 0" }}>
            {zodiacInfo.enName}
          </p>

          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "white",
              color: elementStyle.text,
              border: `1px solid ${elementStyle.border}`,
              marginBottom: "16px"
            }}
          >
            {zodiacInfo.dateRange}
          </span>

          <div style={{ width: "100%", textAlign: "left", fontSize: "14px", marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ opacity: 0.6 }}>星象属性</span>
              <span style={{ fontWeight: 600 }}>{zodiacInfo.elementZh}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ opacity: 0.6 }}>守护星</span>
              <span style={{ fontWeight: 600 }}>{zodiacInfo.rulingPlanetZh} ({zodiacInfo.rulingPlanet})</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ opacity: 0.6 }}>幸运数字</span>
              <span style={{ fontWeight: 600 }}>{zodiacInfo.luckyNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ opacity: 0.6 }}>幸运颜色</span>
              <span style={{ fontWeight: 600 }}>{zodiacInfo.luckyColor}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ opacity: 0.6 }}>幸运花</span>
              <span style={{ fontWeight: 600 }}>{zodiacInfo.luckyFlower}</span>
            </div>
          </div>
        </article>

        {/* Right Side: Interactive Tabs & Content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #eee", gap: "24px", marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("fortune")}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "16px",
                fontWeight: activeTab === "fortune" ? "bold" : "normal",
                color: activeTab === "fortune" ? elementStyle.text : "#666",
                borderBottom: activeTab === "fortune" ? `3px solid ${elementStyle.text}` : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              今日运势
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("personality")}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "16px",
                fontWeight: activeTab === "personality" ? "bold" : "normal",
                color: activeTab === "personality" ? elementStyle.text : "#666",
                borderBottom: activeTab === "personality" ? `3px solid ${elementStyle.text}` : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              性格解析
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compatibility")}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "16px",
                fontWeight: activeTab === "compatibility" ? "bold" : "normal",
                color: activeTab === "compatibility" ? elementStyle.text : "#666",
                borderBottom: activeTab === "compatibility" ? `3px solid ${elementStyle.text}` : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              配对与建议
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1 }}>
            {activeTab === "fortune" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Summary Card */}
                <div style={{ padding: "16px", borderRadius: "8px", background: "#f9f9fb", borderLeft: `4px solid ${elementStyle.text}` }}>
                  <h4 style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>今日运势简评</h4>
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#444" }}>{dailyFortune.summary}</p>
                </div>

                {/* Score Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="detail-card" style={{ padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong>爱情指数</strong>
                      <span style={{ color: "#e11d48" }}>{"★".repeat(dailyFortune.loveScore)}{"☆".repeat(5 - dailyFortune.loveScore)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{dailyFortune.loveText}</p>
                  </div>

                  <div className="detail-card" style={{ padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong>工作指数</strong>
                      <span style={{ color: "#d97706" }}>{"★".repeat(dailyFortune.careerScore)}{"☆".repeat(5 - dailyFortune.careerScore)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{dailyFortune.careerText}</p>
                  </div>

                  <div className="detail-card" style={{ padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong>财富指数</strong>
                      <span style={{ color: "#059669" }}>{"★".repeat(dailyFortune.financeScore)}{"☆".repeat(5 - dailyFortune.financeScore)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{dailyFortune.financeText}</p>
                  </div>

                  <div className="detail-card" style={{ padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <strong>健康指数</strong>
                      <span style={{ color: "#2563eb" }}>{"★".repeat(dailyFortune.healthScore)}{"☆".repeat(5 - dailyFortune.healthScore)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{dailyFortune.healthText}</p>
                  </div>
                </div>

                {/* Day Luck Info */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ padding: "10px 16px", borderRadius: "6px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", flex: 1, textAlign: "center" }}>
                    <span style={{ fontSize: "12px", color: "#166534", display: "block" }}>今日幸运数</span>
                    <strong style={{ fontSize: "18px", color: "#15803d" }}>{dailyFortune.luckyNumber}</strong>
                  </div>
                  <div style={{ padding: "10px 16px", borderRadius: "6px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", flex: 1, textAlign: "center" }}>
                    <span style={{ fontSize: "12px", color: "#991b1b", display: "block" }}>今日幸运色</span>
                    <strong style={{ fontSize: "18px", color: "#b91c1c" }}>{dailyFortune.luckyColor}</strong>
                  </div>
                  <div style={{ padding: "10px 16px", borderRadius: "6px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", flex: 1, textAlign: "center" }}>
                    <span style={{ fontSize: "12px", color: "#1e3a8a", display: "block" }}>今日幸运方位</span>
                    <strong style={{ fontSize: "18px", color: "#1d4ed8" }}>{dailyFortune.luckyDirection}方向</strong>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "personality" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p style={{ fontSize: "15px", lineHeight: "1.7", color: "#333", margin: 0 }}>{zodiacInfo.description}</p>

                <div>
                  <h4 style={{ fontWeight: "bold", margin: "0 0 10px 0" }}>👍 性格优势</h4>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {zodiacInfo.strengths.map((str) => (
                      <span key={str} style={{ padding: "6px 12px", background: "#f0fdf4", color: "#166534", borderRadius: "4px", fontSize: "13px", fontWeight: "500" }}>
                        {str}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontWeight: "bold", margin: "0 0 10px 0" }}>⚠️ 性格盲区</h4>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {zodiacInfo.weaknesses.map((weak) => (
                      <span key={weak} style={{ padding: "6px 12px", background: "#fff5f5", color: "#c53030", borderRadius: "4px", fontSize: "13px", fontWeight: "500" }}>
                        {weak}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "compatibility" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h4 style={{ fontWeight: "bold", margin: "0 0 12px 0" }}>❤️ 最佳匹配星座</h4>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {zodiacInfo.compatibility.map((item) => {
                      // Find matching zodiac to display their symbol
                      const entry = Object.values(ZODIAC_DATA).find(z => z.name === item);
                      return (
                        <div key={item} className="detail-card" style={{ padding: "16px", display: "flex", flex: 1, flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "32px" }}>{entry?.symbol}</span>
                          <strong>{item}</strong>
                          <span style={{ fontSize: "12px", opacity: 0.6 }}>{entry?.dateRange}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: "16px", borderRadius: "8px", background: "#fefaf0", border: "1px solid #fde8c3" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#b45309", fontWeight: "bold" }}>💡 相处指南</h4>
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#6b21a8" }}>
                    作为一个<strong>{zodiacInfo.elementZh}</strong>，你与同属火/风或土/水的星座往往容易形成自然的默契。在人际交往中，试着用你的优势（如{zodiacInfo.strengths[0]}）去感染他人，同时在遇到分歧时，注意避免{zodiacInfo.weaknesses[0]}，可以让你们的感情或者合作更加持久稳固。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
