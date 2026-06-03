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

export default function RandomPickerTool({ manifest }: ToolAppProps) {
  const [activeTab, setActiveTab] = useState<"number" | "list">("number");
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
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">游戏娱乐工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>支持数字范围抽取和自定义文本列表抽取，采用精美的卡片翻转滚动动画和音乐音效。</p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", borderBottom: "2px solid #2d2d30", marginBottom: "1.25rem" }}>
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
            borderBottom: activeTab === "number" ? "2px solid #ffe066" : "none",
            color: activeTab === "number" ? "#ffe066" : "#8e8e93",
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
            borderBottom: activeTab === "list" ? "2px solid #ffe066" : "none",
            color: activeTab === "list" ? "#ffe066" : "#8e8e93",
            fontWeight: "bold",
            cursor: isSpinning ? "default" : "pointer",
            marginBottom: "-2px"
          }}
        >
          📋 从列表抽取
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: "0.5rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
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

        <button type="button" disabled={isSpinning} onClick={() => setSeed(String(Date.now()).slice(-6))}>随机生成种子</button>
        <button type="button" className="btn-primary" disabled={isSpinning} onClick={handleDraw} style={{ backgroundColor: "#ffe066", color: "#121214", fontWeight: "bold" }}>
          {isSpinning ? "抽取中..." : "开始抽取结果"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {/* Left Side: Parameters Form depending on active tab */}
        <div style={{ background: "#1e1e24", padding: "1.25rem", borderRadius: "8px", border: "1px solid #2d2d30", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {activeTab === "number" ? (
            <>
              <h3 style={{ fontSize: "1.1rem", margin: 0, borderBottom: "1px solid #2d2d30", paddingBottom: "0.5rem" }}>数字范围设置</h3>
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
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={allowDupNumbers}
                    disabled={isSpinning}
                    onChange={(e) => setAllowDupNumbers(e.target.checked)}
                  />
                  允许数字重复
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
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
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2d2d30", paddingBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>候选项列表</h3>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button type="button" disabled={isSpinning} onClick={() => loadPreset("names")} style={{ padding: "2px 6px", fontSize: "0.75rem" }}>学生姓名</button>
                  <button type="button" disabled={isSpinning} onClick={() => loadPreset("activities")} style={{ padding: "2px 6px", fontSize: "0.75rem" }}>团建项目</button>
                  <button type="button" disabled={isSpinning} onClick={() => loadPreset("awards")} style={{ padding: "2px 6px", fontSize: "0.75rem" }}>抽奖等级</button>
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

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allowDupList}
                  disabled={isSpinning}
                  onChange={(e) => setAllowDupList(e.target.checked)}
                />
                允许选项重复抽取
              </label>
            </>
          )}
        </div>

        {/* Right Side: Draw Display Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Output Display Card */}
          <div style={{ background: "#121214", border: "1px solid #2d2d30", borderRadius: "8px", padding: "1.5rem", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
            <h4 style={{ position: "absolute", top: "0.75rem", left: "0.75rem", margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.5 }}>
              🎯 抽取成果区
            </h4>

            {cards.length === 0 ? (
              <div style={{ textAlign: "center", color: "#8e8e93" }}>
                <p style={{ fontSize: "1.2rem", fontWeight: "500", marginBottom: "0.5rem" }}>准备就绪</p>
                <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>点击上方的“开始抽取结果”按钮进行抽取</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", width: "100%", padding: "0.5rem 0" }}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      background: card.isRolling ? "#2d2d30" : "linear-gradient(135deg, #2c2a1c 0%, #1e1b10 100%)",
                      border: card.isRolling ? "2px solid #555" : "2px solid #ffe066",
                      borderRadius: "10px",
                      padding: "1rem 1.5rem",
                      minWidth: "100px",
                      textAlign: "center",
                      boxShadow: card.isRolling ? "none" : "0 4px 15px rgba(255, 224, 102, 0.15)",
                      transform: card.isRolling ? "scale(0.98)" : "scale(1)",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box"
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.6rem",
                        fontWeight: "bold",
                        color: card.isRolling ? "#ffffff" : "#ffe066",
                        fontFamily: activeTab === "number" ? "monospace" : "inherit",
                        textShadow: card.isRolling ? "none" : "0 2px 4px rgba(0,0,0,0.5)",
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
              <div style={{ marginTop: "1rem", color: "#ff4d4f", fontSize: "0.85rem", fontWeight: "bold" }}>
                🎉 抽取完成！
              </div>
            )}
          </div>

          {/* History Log */}
          <div style={{ background: "#1e1e24", border: "1px solid #2d2d30", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>抽取历史记录</h4>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" disabled={history.length === 0} onClick={copyHistory} style={{ padding: "2px 8px", fontSize: "0.8rem" }}>
                  {copied ? "已复制" : "复制全部"}
                </button>
                <button type="button" disabled={history.length === 0} onClick={clearHistory} style={{ padding: "2px 8px", fontSize: "0.8rem" }}>清空</button>
              </div>
            </div>

            <textarea
              readOnly
              value={history.join("\n")}
              placeholder="历史记录为空"
              spellCheck={false}
              rows={5}
              style={{ fontSize: "0.85rem", background: "#121214", color: "#e3e3e3", border: "1px solid #2d2d30" }}
            />
          </div>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
    </section>
  );
}
