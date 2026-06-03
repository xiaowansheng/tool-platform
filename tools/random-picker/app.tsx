"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface RollCard {
  id: number;
  currentDisplay: string;
  finalValue: string;
  isRolling: boolean;
}

const listPresets: Record<string, string> = {
  names: `张伟\n王芳\n李杰\n陈婷\n刘明\n赵军\n周华\n杨洋\n徐超\n孙静`,
  activities: `户外烧烤\n剧本杀\n密室逃脱\n轰趴馆\n露营爬山\n羽毛球桌球\nKTV唱歌\n火锅大餐`,
  awards: `特等奖 (MacBook)\n一等奖 (iPad)\n二等奖 (Switch)\n三等奖 (无线耳机)\n阳光普照奖 (定制水杯)`
};

function hashSeed(seed: string) {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRandom(seed: string) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = Math.imul(value, 48271) % 0x7fffffff;
    return (value & 0x7fffffff) / 0x7fffffff;
  };
}

const themes = [
  { id: "classic", name: "经典", primary: "#ffe066", secondary: "#ff9f43" },
  { id: "cyberpunk", name: "赛博霓虹", primary: "#00f0ff", secondary: "#ff007f" },
  { id: "retro", name: "复古像素", primary: "#ff6b6b", secondary: "#4ecdc4" },
  { id: "forest", name: "绿野仙踪", primary: "#a3e635", secondary: "#10b981" },
  { id: "sunset", name: "落日金辉", primary: "#f97316", secondary: "#facc15" },
  { id: "cosmic", name: "极光魅影", primary: "#a855f7", secondary: "#ec4899" }
];

export default function RandomPickerTool({ manifest }: ToolAppProps) {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("entertainment_theme") || "classic";
    }
    return "classic";
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("entertainment_theme", newTheme);
  };

  const [activeTab, setActiveTab] = useState<"number" | "list" | "team">("number");
  const [seed, setSeed] = useState("lucky-draw");
  const [extractCount, setExtractCount] = useState(1);
  const [spinCount, setSpinCount] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState("");

  // Tab 1: Numbers Config
  const [numMin, setNumMin] = useState(1);
  const [numMax, setNumMax] = useState(100);
  const [allowDupNumbers, setAllowDupNumbers] = useState(false);
  const [sortNumbers, setSortNumbers] = useState(true);

  // Tab 2: List Config
  const [listInput, setListInput] = useState(listPresets.names);
  const [allowDupList, setAllowDupList] = useState(false);

  // Tab 3: Grouping Config
  const [teamNamesInput, setTeamNamesInput] = useState(listPresets.names);
  const [teamCount, setTeamCount] = useState(3);
  const [teamsState, setTeamsState] = useState<string[][]>([]);

  // Animation status
  const [cards, setCards] = useState<RollCard[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound effects
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      // Ignored
    }
  };

  const playResolveSound = (idx: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "triangle";
      const baseFreq = 440 * Math.pow(1.5, idx % 3);
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Ignored
    }
  };

  // Parsing and getting list items
  const parsedListItems = useMemo(() => {
    return listInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [listInput]);

  const loadPreset = (key: string) => {
    if (isSpinning) return;
    setListInput(listPresets[key] || "");
    setCards([]);
    setError("");
  };

  // Perform extraction logic
  const handleDraw = () => {
    if (isSpinning) return;
    setError("");
    setCopied(false);

    const nextSpinCount = spinCount + 1;
    const rng = seededRandom(`${seed}:${nextSpinCount}`);

    let winners: string[] = [];

    if (activeTab === "team") {
      const names = teamNamesInput.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
      if (names.length === 0) {
        setError("名单不能为空。");
        return;
      }
      if (teamCount <= 0) {
        setError("分组数量必须大于 0。");
        return;
      }
      setSpinCount(nextSpinCount);
      setIsSpinning(true);

      // Play shuffling sound/ticks
      let ticks = 0;
      const tickTimer = setInterval(() => {
        playTickSound();
        ticks++;
        if (ticks >= 10) clearInterval(tickTimer);
      }, 100);

      setTimeout(() => {
        const rand = seededRandom(`${seed}:${nextSpinCount}`);
        const shuffled = [...names].sort(() => rand() - 0.5);
        const teams = Array.from({ length: Math.max(1, teamCount) }, () => [] as string[]);
        shuffled.forEach((name, index) => teams[index % teams.length].push(name));

        setTeamsState(teams);
        setIsSpinning(false);
        playResolveSound(0);

        const timeString = new Date().toLocaleTimeString();
        const output = teams.map((team, index) => `第 ${index + 1} 组: ${team.join(", ")}`).join("\n");
        const record = `[${timeString}] 随机分组第 ${nextSpinCount} 组 (共 ${names.length} 人, ${teamCount} 组):\n${output}`;
        setHistory((prev) => [record, ...prev].slice(0, 30));
      }, 1000);
      return;
    }

    if (activeTab === "number") {
      if (numMin > numMax) {
        setError("最小值不能大于最大值。");
        return;
      }
      const range = numMax - numMin + 1;
      if (extractCount <= 0) {
        setError("抽取数量必须大于 0。");
        return;
      }
      if (!allowDupNumbers && extractCount > range) {
        setError(`在不重复的情况下，最多只能抽取 ${range} 个数字。`);
        return;
      }

      const generated: number[] = [];
      if (allowDupNumbers) {
        for (let i = 0; i < extractCount; i++) {
          const num = Math.floor(rng() * range) + numMin;
          generated.push(num);
        }
      } else {
        // Unique numbers
        const pool = Array.from({ length: range }, (_, i) => i + numMin);
        for (let i = 0; i < extractCount; i++) {
          const idx = Math.floor(rng() * pool.length);
          generated.push(pool.splice(idx, 1)[0]);
        }
      }

      if (sortNumbers) {
        generated.sort((a, b) => a - b);
      }

      winners = generated.map(String);
    } else {
      // List draw
      if (parsedListItems.length === 0) {
        setError("列表候选项不能为空。");
        return;
      }
      if (extractCount <= 0) {
        setError("抽取数量必须大于 0。");
        return;
      }
      if (!allowDupList && extractCount > parsedListItems.length) {
        setError(`在不重复的情况下，最多只能抽取当前列表长度 (${parsedListItems.length}) 个选项。`);
        return;
      }

      const pool = [...parsedListItems];
      if (allowDupList) {
        for (let i = 0; i < extractCount; i++) {
          const idx = Math.floor(rng() * pool.length);
          winners.push(pool[idx]);
        }
      } else {
        for (let i = 0; i < extractCount; i++) {
          const idx = Math.floor(rng() * pool.length);
          winners.push(pool.splice(idx, 1)[0]);
        }
      }
    }

    setSpinCount(nextSpinCount);
    setIsSpinning(true);

    // Initialise rolling state for cards
    const initialCards: RollCard[] = winners.map((val, idx) => ({
      id: idx,
      currentDisplay: activeTab === "number" ? String(numMin) : parsedListItems[0],
      finalValue: val,
      isRolling: true
    }));
    setCards(initialCards);

    // Staggered stop animation
    let finishedCount = 0;

    initialCards.forEach((card, idx) => {
      // Rolling interval
      const intervalMs = 60 + Math.random() * 40;
      const rollTimer = setInterval(() => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.id === card.id && c.isRolling) {
              // Pick random display value
              let randVal = "";
              if (activeTab === "number") {
                randVal = String(Math.floor(Math.random() * (numMax - numMin + 1)) + numMin);
              } else {
                randVal = parsedListItems[Math.floor(Math.random() * parsedListItems.length)];
              }
              playTickSound();
              return { ...c, currentDisplay: randVal };
            }
            return c;
          })
        );
      }, intervalMs);

      // Timeout to resolve card
      // Stagger resolution: Card 0 stops at 1.0s, Card 1 at 1.4s, Card 2 at 1.8s...
      const resolveDelay = 1000 + idx * 450;
      setTimeout(() => {
        clearInterval(rollTimer);
        setCards((prev) =>
          prev.map((c) => {
            if (c.id === card.id) {
              playResolveSound(idx);
              return { ...c, currentDisplay: c.finalValue, isRolling: false };
            }
            return c;
          })
        );

        finishedCount++;
        if (finishedCount === initialCards.length) {
          setIsSpinning(false);
          // Add to history
          const timeString = new Date().toLocaleTimeString();
          const record = `[${timeString}] 抽取第 ${nextSpinCount} 组 (共 ${winners.length} 个): ${winners.join(", ")}`;
          setHistory((prev) => [record, ...prev].slice(0, 30));
        }
      }, resolveDelay);
    });
  };

  const copyHistory = async () => {
    try {
      await navigator.clipboard.writeText(history.join("\n"));
      setCopied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "复制失败");
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <section className={`tool-panel theme-${theme}`}>
      {/* Scoped shaking animation CSS block and themes */}
      <style>{`
        /* Theme general overrides */
        .tool-panel.theme-cyberpunk {
          --bg-base: #0d0015;
          --bg-subtle: #18002a;
          --bg-muted: #24003d;
          --border-default: rgba(0, 240, 255, 0.15);
          --border-subtle: rgba(0, 240, 255, 0.08);
          --border-strong: rgba(0, 240, 255, 0.3);
          --accent-primary: #00f0ff;
          --accent-primary-dim: rgba(0, 240, 255, 0.1);
          --text-primary: #e2d5f0;
          --text-secondary: #a894c0;
          --card-bg: rgba(24, 0, 42, 0.8);
          --card-border: rgba(0, 240, 255, 0.15);
          --card-hover-bg: rgba(36, 0, 61, 0.9);
          --card-hover-border: rgba(255, 0, 127, 0.4);
          --input-bg: rgba(13, 0, 21, 0.9);
          --input-border: rgba(0, 240, 255, 0.2);
        }
        .tool-panel.theme-retro {
          --bg-base: #1a1c1e;
          --bg-subtle: #2d3135;
          --bg-muted: #3d4349;
          --border-default: #000000;
          --border-subtle: #1a1c1e;
          --border-strong: #000000;
          --accent-primary: #ff6b6b;
          --accent-primary-dim: rgba(255, 107, 107, 0.1);
          --text-primary: #f7f7f7;
          --text-secondary: #a0aab5;
          --card-bg: #2d3135;
          --card-border: #000000;
          --card-hover-bg: #3d4349;
          --card-hover-border: #ff6b6b;
          --input-bg: #1a1c1e;
          --input-border: #000000;
          font-family: monospace, Courier, sans-serif;
        }
        .tool-panel.theme-forest {
          --bg-base: #0f1e16;
          --bg-subtle: #172e22;
          --bg-muted: #1e3c2c;
          --border-default: rgba(163, 230, 53, 0.12);
          --border-subtle: rgba(163, 230, 53, 0.06);
          --border-strong: rgba(163, 230, 53, 0.22);
          --accent-primary: #a3e635;
          --accent-primary-dim: rgba(163, 230, 53, 0.1);
          --text-primary: #e1efe6;
          --text-secondary: #8da596;
          --card-bg: rgba(23, 46, 34, 0.78);
          --card-border: rgba(163, 230, 53, 0.09);
          --card-hover-bg: rgba(30, 60, 44, 0.92);
          --card-hover-border: rgba(16, 185, 129, 0.22);
          --input-bg: rgba(15, 30, 22, 0.82);
          --input-border: rgba(163, 230, 53, 0.14);
        }
        .tool-panel.theme-sunset {
          --bg-base: #251410;
          --bg-subtle: #38201a;
          --bg-muted: #4b2a22;
          --border-default: rgba(249, 115, 22, 0.12);
          --border-subtle: rgba(249, 115, 22, 0.06);
          --border-strong: rgba(249, 115, 22, 0.22);
          --accent-primary: #f97316;
          --accent-primary-dim: rgba(249, 115, 22, 0.1);
          --text-primary: #faeae6;
          --text-secondary: #bc9e96;
          --card-bg: rgba(56, 32, 26, 0.78);
          --card-border: rgba(249, 115, 22, 0.09);
          --card-hover-bg: rgba(75, 42, 34, 0.92);
          --card-hover-border: rgba(250, 204, 21, 0.22);
          --input-bg: rgba(37, 20, 16, 0.82);
          --input-border: rgba(249, 115, 22, 0.14);
        }
        .tool-panel.theme-cosmic {
          --bg-base: #0b0914;
          --bg-subtle: #161226;
          --bg-muted: #211c38;
          --border-default: rgba(168, 85, 247, 0.12);
          --border-subtle: rgba(168, 85, 247, 0.06);
          --border-strong: rgba(168, 85, 247, 0.22);
          --accent-primary: #a855f7;
          --accent-primary-dim: rgba(168, 85, 247, 0.1);
          --text-primary: #f3e8ff;
          --text-secondary: #bca0db;
          --card-bg: rgba(22, 18, 38, 0.78);
          --card-border: rgba(168, 85, 247, 0.09);
          --card-hover-bg: rgba(33, 28, 56, 0.92);
          --card-hover-border: rgba(236, 72, 153, 0.22);
          --input-bg: rgba(11, 9, 20, 0.82);
          --input-border: rgba(168, 85, 247, 0.14);
        }

        /* Default / Classic theme values */
        .tool-panel {
          --picker-card-resolved-bg: linear-gradient(135deg, rgba(255, 224, 102, 0.15) 0%, rgba(255, 159, 67, 0.05) 100%);
          --picker-card-shadow: rgba(255, 224, 102, 0.15);
        }
        .tool-panel.theme-cyberpunk {
          --picker-card-resolved-bg: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(255, 0, 127, 0.05) 100%);
          --picker-card-shadow: rgba(0, 240, 255, 0.2);
        }
        .tool-panel.theme-retro {
          --picker-card-resolved-bg: #c0c0c0;
          --picker-card-shadow: rgba(0, 0, 0, 0.3);
        }
        .tool-panel.theme-forest {
          --picker-card-resolved-bg: linear-gradient(135deg, rgba(163, 230, 53, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
          --picker-card-shadow: rgba(163, 230, 53, 0.2);
        }
        .tool-panel.theme-sunset {
          --picker-card-resolved-bg: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(250, 204, 21, 0.05) 100%);
          --picker-card-shadow: rgba(249, 115, 22, 0.2);
        }
        .tool-panel.theme-cosmic {
          --picker-card-resolved-bg: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%);
          --picker-card-shadow: rgba(168, 85, 247, 0.2);
        }

        /* Card styles */
        .picker-card {
          border-radius: 10px;
          padding: 1rem 1.5rem;
          min-width: 100px;
          text-align: center;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .picker-card.rolling {
          background: var(--bg-muted, #2d2d30);
          border: 2px solid var(--border-strong, #555);
          box-shadow: none;
          transform: scale(0.98);
        }
        .picker-card.rolling span {
          color: var(--text-primary, #ffffff);
          text-shadow: none;
        }
        .picker-card.resolved {
          background: var(--picker-card-resolved-bg, linear-gradient(135deg, rgba(255, 224, 102, 0.15) 0%, rgba(255, 159, 67, 0.05) 100%));
          border: 2px solid var(--accent-primary, #ffe066);
          box-shadow: 0 4px 15px var(--picker-card-shadow, rgba(255, 224, 102, 0.15));
          transform: scale(1);
        }
        .picker-card.resolved span {
          color: var(--accent-primary, #ffe066);
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        /* Retro theme override */
        .theme-retro .picker-card {
          border-radius: 0px !important;
        }
        .theme-retro .picker-card.resolved {
          border: 2px inset #808080 !important;
        }
        .theme-retro .picker-card.rolling {
          border: 2px inset #808080 !important;
        }
        .theme-retro .picker-card.resolved span {
          color: #000080 !important;
          text-shadow: none !important;
        }

        /* Generic field/presets/button styles to support themes fully */
        .tool-field input, .tool-field textarea {
          background: var(--input-bg, #121214) !important;
          color: var(--text-primary, #e3e3e3) !important;
          border: 1px solid var(--input-border, #2d2d30) !important;
          border-radius: 4px;
        }
        .tool-field input:focus, .tool-field textarea:focus {
          border-color: var(--accent-primary, #ffe066) !important;
          outline: none;
        }
        
        .presets-btn {
          background: var(--bg-muted, #2d2d30);
          color: var(--text-secondary, #8e8e93);
          border: 1px solid var(--border-default, #2d2d30);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          padding: 2px 6px;
          font-size: 0.75rem;
        }
        .presets-btn:hover {
          background: var(--card-hover-bg, #3d4349);
          border-color: var(--accent-primary, #ffe066);
          color: var(--text-primary, #ffffff);
        }
        
        .tool-toolbar button {
          background: var(--bg-muted, #2d2d30);
          color: var(--text-primary, #ffffff);
          border: 1px solid var(--border-default, #2d2d30);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0.4rem 1.0rem;
          font-weight: 500;
        }
        .tool-toolbar button:hover {
          background: var(--card-hover-bg, #3d4349);
          border-color: var(--accent-primary, #ffe066);
        }
        
        .history-btn {
          background: var(--bg-muted, #2d2d30);
          color: var(--text-primary, #ffffff);
          border: 1px solid var(--border-default, #2d2d30);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          padding: 2px 8px;
          font-size: 0.8rem;
        }
        .history-btn:hover {
          background: var(--card-hover-bg, #3d4349);
          border-color: var(--accent-primary, #ffe066);
        }
      `}</style>

      <div className="tool-panel__header" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="eyebrow">游戏娱乐工具</p>
            <h2>{manifest.name}</h2>
          </div>
          {/* Theme selector UI */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", background: "rgba(255,255,255,0.03)", padding: "0.35rem 0.6rem", borderRadius: "20px", border: "1px solid var(--border-default)" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.7, marginRight: "0.2rem" }}>🎨 主题：</span>
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeChange(t.id)}
                style={{
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "12px",
                  background: theme === t.id ? t.primary : "transparent",
                  color: theme === t.id ? "#121214" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: theme === t.id ? "bold" : "normal",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: theme === t.id ? "#121214" : t.primary }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <p style={{ marginTop: "0.5rem" }}>支持数字范围抽取、自定义文本列表抽取以及随机分组，采用精美的卡片翻转滚动动画和音乐音效。</p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-default, #2d2d30)", marginBottom: "1.25rem" }}>
        <button
          type="button"
          disabled={isSpinning}
          onClick={() => {
            setActiveTab("number");
            setCards([]);
          }}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "number" ? "2px solid var(--accent-primary, #ffe066)" : "none",
            color: activeTab === "number" ? "var(--accent-primary, #ffe066)" : "var(--text-secondary, #8e8e93)",
            fontWeight: "bold",
            cursor: isSpinning ? "default" : "pointer",
            marginBottom: "-2px"
          }}
        >
          🔢 随机抽取数字
        </button>
        <button
          type="button"
          disabled={isSpinning}
          onClick={() => {
            setActiveTab("list");
            setCards([]);
          }}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "list" ? "2px solid var(--accent-primary, #ffe066)" : "none",
            color: activeTab === "list" ? "var(--accent-primary, #ffe066)" : "var(--text-secondary, #8e8e93)",
            fontWeight: "bold",
            cursor: isSpinning ? "default" : "pointer",
            marginBottom: "-2px"
          }}
        >
          📋 从列表抽取
        </button>
        <button
          type="button"
          disabled={isSpinning}
          onClick={() => {
            setActiveTab("team");
            setCards([]);
          }}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "team" ? "2px solid var(--accent-primary, #ffe066)" : "none",
            color: activeTab === "team" ? "var(--accent-primary, #ffe066)" : "var(--text-secondary, #8e8e93)",
            fontWeight: "bold",
            cursor: isSpinning ? "default" : "pointer",
            marginBottom: "-2px"
          }}
        >
          👥 随机分组
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: "0.5rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary, #8e8e93)" }}>
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            🔊 声音反馈
          </label>
        </div>
      </div>

      {/* Config Toolbar */}
      <div className="tool-toolbar tool-toolbar--grid" style={{ marginBottom: "1.5rem" }}>
        <label className="tool-field tool-field--compact">
          <span>随机种子 (防止作弊)</span>
          <input value={seed} disabled={isSpinning} onChange={(e) => setSeed(e.target.value)} />
        </label>

        {activeTab !== "team" ? (
          <label className="tool-field tool-field--compact">
            <span>抽取个数</span>
            <input
              type="number"
              min={1}
              max={50}
              value={extractCount}
              disabled={isSpinning}
              onChange={(e) => setExtractCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </label>
        ) : (
          <label className="tool-field tool-field--compact">
            <span>分组数量</span>
            <input
              type="number"
              min={1}
              max={20}
              value={teamCount}
              disabled={isSpinning}
              onChange={(e) => setTeamCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </label>
        )}

        <button type="button" disabled={isSpinning} onClick={() => setSeed(String(Date.now()).slice(-6))}>随机生成种子</button>
        <button
          type="button"
          className="btn-primary"
          disabled={isSpinning}
          onClick={handleDraw}
          style={{
            backgroundColor: "var(--accent-primary, #ffe066)",
            color: "var(--bg-base, #121214)",
            fontWeight: "bold",
            border: "none",
            borderRadius: "4px",
            padding: "0.4rem 1.2rem",
            cursor: "pointer"
          }}
        >
          {isSpinning ? "抽取中..." : "开始抽取结果"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {/* Left Side: Parameters Form depending on active tab */}
        <div style={{ background: "var(--card-bg, #1e1e24)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--card-border, #2d2d30)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {activeTab === "number" ? (
            <>
              <h3 style={{ fontSize: "1.1rem", margin: 0, borderBottom: "1px solid var(--border-default, #2d2d30)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>数字范围设置</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="tool-field">
                  <span>最小值 (Min)</span>
                  <input
                    type="number"
                    value={numMin}
                    disabled={isSpinning}
                    onChange={(e) => setNumMin(Number(e.target.value))}
                  />
                </label>
                <label className="tool-field">
                  <span>最大值 (Max)</span>
                  <input
                    type="number"
                    value={numMax}
                    disabled={isSpinning}
                    onChange={(e) => setNumMax(Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={allowDupNumbers}
                    disabled={isSpinning}
                    onChange={(e) => setAllowDupNumbers(e.target.checked)}
                  />
                  允许数字重复
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={sortNumbers}
                    disabled={isSpinning}
                    onChange={(e) => setSortNumbers(e.target.checked)}
                  />
                  抽取结果升序排序
                </label>
              </div>
            </>
          ) : activeTab === "list" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default, #2d2d30)", paddingBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--text-primary)" }}>候选项列表</h3>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button type="button" className="presets-btn" disabled={isSpinning} onClick={() => loadPreset("names")}>学生姓名</button>
                  <button type="button" className="presets-btn" disabled={isSpinning} onClick={() => loadPreset("activities")}>团建项目</button>
                  <button type="button" className="presets-btn" disabled={isSpinning} onClick={() => loadPreset("awards")}>抽奖等级</button>
                </div>
              </div>

              <label className="tool-field">
                <span>每行输入一个选项 (总数: {parsedListItems.length})</span>
                <textarea
                  value={listInput}
                  disabled={isSpinning}
                  onChange={(e) => setListInput(e.target.value)}
                  placeholder="输入选项，例如：&#10;小明&#10;小红&#10;小白"
                  rows={8}
                  style={{ fontFamily: "sans-serif", fontSize: "0.9rem" }}
                />
              </label>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={allowDupList}
                  disabled={isSpinning}
                  onChange={(e) => setAllowDupList(e.target.checked)}
                />
                允许选项重复抽取
              </label>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default, #2d2d30)", paddingBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--text-primary)" }}>分组名单</h3>
                <button type="button" className="presets-btn" disabled={isSpinning} onClick={() => setTeamNamesInput(listPresets.names)}>加载示例名单</button>
              </div>

              <label className="tool-field">
                <span>每行输入或逗号分隔一个名字</span>
                <textarea
                  value={teamNamesInput}
                  disabled={isSpinning}
                  onChange={(e) => setTeamNamesInput(e.target.value)}
                  placeholder="输入名字，例如：&#10;Ada&#10;Linus&#10;Grace"
                  rows={8}
                  style={{ fontFamily: "sans-serif", fontSize: "0.9rem" }}
                />
              </label>
            </>
          )}
        </div>

        {/* Right Side: Draw Display Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Output Display Card */}
          <div style={{ background: "var(--bg-base, #121214)", border: "1px solid var(--border-default, #2d2d30)", borderRadius: "8px", padding: "1.5rem", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
            <h4 style={{ position: "absolute", top: "0.75rem", left: "0.75rem", margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.5, color: "var(--text-secondary)" }}>
              {activeTab === "team" ? "👥 分组结果区" : "🎯 抽取成果区"}
            </h4>

            {activeTab === "team" ? (
              isSpinning ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: "500", marginBottom: "0.5rem" }}>🔄 正在随机打乱名单并分组...</p>
                </div>
              ) : teamsState.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: "500", marginBottom: "0.5rem" }}>等待分组</p>
                  <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>点击上方的“开始抽取结果”按钮进行分组</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxHeight: "400px", overflowY: "auto" }}>
                  {teamsState.map((team, idx) => (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "10px 14px", textAlign: "left" }}>
                      <strong style={{ color: "var(--accent-primary)", fontSize: "0.95rem" }}>第 {idx + 1} 组 ({team.length} 人)</strong>
                      <p style={{ margin: "5px 0 0 0", color: "var(--text-primary)" }}>{team.join(", ") || "-"}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <>
                {cards.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-secondary, #8e8e93)" }}>
                    <p style={{ fontSize: "1.2rem", fontWeight: "500", marginBottom: "0.5rem" }}>准备就绪</p>
                    <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>点击上方的“开始抽取结果”按钮进行抽取</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", width: "100%", padding: "0.5rem 0" }}>
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className={`picker-card ${card.isRolling ? "rolling" : "resolved"}`}
                      >
                        <span
                          style={{
                            fontSize: "1.6rem",
                            fontWeight: "bold",
                            fontFamily: activeTab === "number" ? "monospace" : "inherit",
                            wordBreak: "break-all"
                          }}
                        >
                          {card.currentDisplay}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!isSpinning && cards.length > 0 && (
                  <div style={{ marginTop: "1rem", color: "var(--accent-primary, #ff4d4f)", fontSize: "0.85rem", fontWeight: "bold" }}>
                    🎉 抽取完成！
                  </div>
                )}
              </>
            )}
          </div>

          {/* History Log */}
          <div style={{ background: "var(--card-bg, #1e1e24)", border: "1px solid var(--card-border, #2d2d30)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)" }}>抽取历史记录</h4>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="history-btn" disabled={history.length === 0} onClick={copyHistory}>
                  {copied ? "已复制" : "复制全部"}
                </button>
                <button type="button" className="history-btn" disabled={history.length === 0} onClick={clearHistory}>清空</button>
              </div>
            </div>

            <textarea
              readOnly
              value={history.join("\n")}
              placeholder="历史记录为空"
              spellCheck={false}
              rows={5}
              style={{ fontSize: "0.85rem", background: "var(--bg-base, #121214)", color: "var(--text-primary, #e3e3e3)", border: "1px solid var(--border-default, #2d2d30)" }}
            />
          </div>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
