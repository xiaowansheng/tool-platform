"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type DiceType = "D4" | "D6" | "D8" | "D10" | "D12" | "D20" | "D100";

interface DiceConfig {
  type: DiceType;
  max: number;
  count: number;
}

interface RolledDiceResult {
  type: DiceType;
  max: number;
  value: number;
  rotationX?: number; // for D6 3D rotation
  rotationY?: number; // for D6 3D rotation
}

// Poker-style Dice Hand evaluation
interface DiceHand {
  rank: number;
  name: string;
}

function evaluateDiceHand(dice: number[]): DiceHand {
  const counts = Array(7).fill(0);
  for (const d of dice) {
    if (d >= 1 && d <= 6) counts[d]++;
  }
  const sortedCounts = [...counts].sort((a, b) => b - a);

  if (sortedCounts[0] === 5) return { rank: 8, name: "五同大豹子 (Five of a Kind)" };
  if (sortedCounts[0] === 4) return { rank: 7, name: "四条 (Four of a Kind)" };
  
  const hasThree = sortedCounts[0] === 3;
  const hasTwo = sortedCounts[1] === 2;
  if (hasThree && hasTwo) return { rank: 6, name: "葫芦 / 满堂红 (Full House)" };

  // Check straight: 1-2-3-4-5 or 2-3-4-5-6
  const unique = Array.from(new Set(dice)).filter(d => d >= 1 && d <= 6).sort();
  if (unique.length === 5 && (unique[4] - unique[0] === 4)) {
    return { rank: 5, name: "顺子 (Straight)" };
  }

  if (hasThree) return { rank: 4, name: "三条 (Three of a Kind)" };
  if (sortedCounts[0] === 2 && sortedCounts[1] === 2) return { rank: 3, name: "两对 (Two Pair)" };
  if (sortedCounts[0] === 2) return { rank: 2, name: "一对 (One Pair)" };

  return { rank: 1, name: "散牌 / 没对子 (High Card)" };
}

const themes = [
  { id: "classic", name: "经典", primary: "#ffe066", secondary: "#ffc83d" },
  { id: "cyberpunk", name: "赛博霓虹", primary: "#00f0ff", secondary: "#ff007f" },
  { id: "retro", name: "复古像素", primary: "#ff6b6b", secondary: "#4ecdc4" },
  { id: "forest", name: "绿野仙踪", primary: "#a3e635", secondary: "#10b981" },
  { id: "sunset", name: "落日金辉", primary: "#f97316", secondary: "#facc15" },
  { id: "cosmic", name: "极光魅影", primary: "#a855f7", secondary: "#ec4899" }
];

const themeConfig: Record<string, { primary: string; secondary: string; bgPanel: string; bgCard: string; textColor: string; buttonText: string; accentDim: string }> = {
  classic: { primary: "#ffe066", secondary: "#ffc83d", bgPanel: "#080f19", bgCard: "rgba(13, 24, 38, 0.78)", textColor: "#ffe066", buttonText: "#121214", accentDim: "rgba(255, 224, 102, 0.05)" },
  cyberpunk: { primary: "#00f0ff", secondary: "#ff007f", bgPanel: "#0d0015", bgCard: "rgba(24, 0, 42, 0.8)", textColor: "#00f0ff", buttonText: "#0d0015", accentDim: "rgba(0, 240, 255, 0.1)" },
  retro: { primary: "#ff6b6b", secondary: "#4ecdc4", bgPanel: "#1a1c1e", bgCard: "#2d3135", textColor: "#ff6b6b", buttonText: "#1a1c1e", accentDim: "rgba(255, 107, 107, 0.1)" },
  forest: { primary: "#a3e635", secondary: "#10b981", bgPanel: "#0f1e16", bgCard: "#172e22", textColor: "#a3e635", buttonText: "#0f1e16", accentDim: "rgba(163, 230, 53, 0.1)" },
  sunset: { primary: "#f97316", secondary: "#facc15", bgPanel: "#251410", bgCard: "#38201a", textColor: "#f97316", buttonText: "#251410", accentDim: "rgba(249, 115, 22, 0.1)" },
  cosmic: { primary: "#a855f7", secondary: "#ec4899", bgPanel: "#0b0914", bgCard: "#161226", textColor: "#c084fc", buttonText: "#0b0914", accentDim: "rgba(168, 85, 247, 0.1)" }
};

const polyhedralColors: Record<string, Record<string, string>> = {
  classic: { D4: "#ff8787", D6: "#ffe066", D8: "#70c1ff", D10: "#a9e34b", D12: "#da77f2", D20: "#ffd43b", D100: "#ffd43b" },
  cyberpunk: { D4: "#ff007f", D6: "#00f0ff", D8: "#9d00ff", D10: "#00ff66", D12: "#fffb00", D20: "#ff5500", D100: "#00f0ff" },
  retro: { D4: "#ff4b4b", D6: "#ffcc00", D8: "#00ccff", D10: "#33cc33", D12: "#cc33ff", D20: "#ff9900", D100: "#ff9900" },
  forest: { D4: "#bc6c25", D6: "#a3e635", D8: "#606c38", D10: "#283618", D12: "#dda15e", D20: "#588157", D100: "#588157" },
  sunset: { D4: "#d62828", D6: "#f77f00", D8: "#fcbf49", D10: "#eae2b7", D12: "#f15bb5", D20: "#f97316", D100: "#f97316" },
  cosmic: { D4: "#ff70a6", D6: "#a855f7", D8: "#ffd670", D10: "#e9ff70", D12: "#c084fc", D20: "#ec4899", D100: "#ec4899" }
};

export default function DiceRollerTool({ manifest }: ToolAppProps) {
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

  const [activeTab, setActiveTab] = useState<"free" | "sicbo" | "battle">("free");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  // 1. Free Roll States
  const [freeDiceConfigs, setFreeDiceConfigs] = useState<Record<DiceType, number>>({
    D4: 0,
    D6: 3,
    D8: 0,
    D10: 0,
    D12: 0,
    D20: 0,
    D100: 0
  });
  const [freeRollResults, setFreeRollResults] = useState<RolledDiceResult[]>([]);
  const [isFreeRolling, setIsFreeRolling] = useState(false);

  // 2. Sic Bo States
  const [chips, setChips] = useState(1000);
  const [betAmount, setBetAmount] = useState(100);
  const [selectedBetZone, setSelectedBetZone] = useState<"big" | "small" | "odd" | "even" | "triple" | null>(null);
  const [sicboDice, setSicboDice] = useState<RolledDiceResult[]>([
    { type: "D6", max: 6, value: 1, rotationX: 0, rotationY: 0 },
    { type: "D6", max: 6, value: 2, rotationX: 0, rotationY: 0 },
    { type: "D6", max: 6, value: 3, rotationX: 0, rotationY: 0 }
  ]);
  const [isSicboRolling, setIsSicboRolling] = useState(false);
  const [sicboMessage, setSicboMessage] = useState("");
  const [cupState, setCupState] = useState<"closed" | "shaking" | "opened">("closed");

  // 3. Battle States
  const [battleBet, setBattleBet] = useState(100);
  const [playerDice, setPlayerDice] = useState<RolledDiceResult[]>([]);
  const [aiDice, setAiDice] = useState<RolledDiceResult[]>([]);
  const [isBattling, setIsBattling] = useState(false);
  const [battleMessage, setBattleMessage] = useState("");
  const [battleHistory, setBattleHistory] = useState<{ player: string; ai: string; result: string }[]>([]);

  // Audio Engines
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load chips from localStorage on client side
  useEffect(() => {
    const savedChips = localStorage.getItem("dice_roller_chips");
    if (savedChips) {
      setChips(Number(savedChips));
    }
  }, []);

  const updateChips = (amount: number) => {
    setChips(amount);
    localStorage.setItem("dice_roller_chips", String(amount));
  };

  // Noise generator for cup shaking sound
  const playRattleTick = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Random sharp wooden/dice sound frequency
      const freq = 1300 + Math.random() * 500;
      osc.type = Math.random() > 0.5 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  };

  // Payout/Landing sound
  const playThudSound = (volume = 0.1) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  };

  // Helper for config
  const changeFreeConfig = (type: DiceType, delta: number) => {
    setFreeDiceConfigs((prev) => {
      const current = prev[type];
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [type]: next };
    });
  };

  const freeRollStats = useMemo(() => {
    const vals = freeRollResults.map((d) => d.value);
    const count = vals.length;
    const total = vals.reduce((sum, v) => sum + v, 0);
    const avg = count > 0 ? (total / count).toFixed(1) : "0.0";
    return { count, total, avg };
  }, [freeRollResults]);

  // Dice shaker simulator
  const triggerShakingAnimation = (
    onTick: () => void,
    onEnd: () => void,
    duration = 1000
  ) => {
    const intervalTime = 80;
    const ticks = duration / intervalTime;
    let currentTick = 0;

    const interval = setInterval(() => {
      onTick();
      playRattleTick();
      currentTick++;
      if (currentTick >= ticks) {
        clearInterval(interval);
        onEnd();
        playThudSound();
      }
    }, intervalTime);
  };

  // Roll handlers
  const handleFreeRoll = () => {
    // Collect selected configs
    const rollQueue: DiceConfig[] = [];
    (Object.keys(freeDiceConfigs) as DiceType[]).forEach((type) => {
      const count = freeDiceConfigs[type];
      if (count > 0) {
        rollQueue.push({
          type,
          count,
          max: type === "D100" ? 100 : Number(type.substring(1))
        });
      }
    });

    if (rollQueue.length === 0) return;

    setIsFreeRolling(true);
    setFreeRollResults([]);

    // Shake animation logic
    triggerShakingAnimation(
      () => {},
      () => {
        const finalResults: RolledDiceResult[] = [];
        rollQueue.forEach((config) => {
          for (let i = 0; i < config.count; i++) {
            const val = Math.floor(Math.random() * config.max) + 1;
            // Introduce 3D rotations if it's D6
            const rotX = Math.floor(Math.random() * 4) * 90 + 360 * 2;
            const rotY = Math.floor(Math.random() * 4) * 90 + 360 * 2;

            finalResults.push({
              type: config.type,
              max: config.max,
              value: val,
              rotationX: rotX,
              rotationY: rotY
            });
          }
        });
        setFreeRollResults(finalResults);
        setIsFreeRolling(false);

        // Append to history
        const resultString = finalResults.map((r) => `${r.type}(${r.value})`).join(", ");
        const totalSum = finalResults.reduce((s, r) => s + r.value, 0);
        setHistory((prev) => [
          `[${new Date().toLocaleTimeString()}] ${resultString} = 总和: ${totalSum}`,
          ...prev
        ].slice(0, 30));
      },
      1200
    );
  };

  // Sic Bo logic
  const handleSicboRoll = () => {
    if (selectedBetZone === null) return;
    if (chips < betAmount) {
      setSicboMessage("你的筹码不足以进行此次投注，请领低保！");
      return;
    }

    setIsSicboRolling(true);
    setSicboMessage("");
    setCupState("shaking");

    triggerShakingAnimation(
      () => {
        // Shuffle temporary rotation values
        setSicboDice((prev) =>
          prev.map((d) => ({
            ...d,
            rotationX: (d.rotationX || 0) + (Math.random() > 0.5 ? 90 : -90),
            rotationY: (d.rotationY || 0) + (Math.random() > 0.5 ? 90 : -90)
          }))
        );
      },
      () => {
        setCupState("opened");
        const rolled: RolledDiceResult[] = Array.from({ length: 3 }, () => {
          const val = Math.floor(Math.random() * 6) + 1;
          const rx = Math.floor(Math.random() * 4) * 90 + 360 * 3;
          const ry = Math.floor(Math.random() * 4) * 90 + 360 * 3;
          return { type: "D6", max: 6, value: val, rotationX: rx, rotationY: ry };
        });

        setSicboDice(rolled);

        const values = rolled.map((d) => d.value);
        const sum = values.reduce((s, v) => s + v, 0);
        const isTriple = values[0] === values[1] && values[1] === values[2];

        let isWin = false;
        let payoutRate = 0;

        if (isTriple) {
          if (selectedBetZone === "triple") {
            isWin = true;
            payoutRate = 30;
          } else {
            // Triple causes Small/Big/Odd/Even to lose (Casino rule)
            isWin = false;
          }
        } else {
          if (selectedBetZone === "small" && sum >= 4 && sum <= 10) {
            isWin = true;
            payoutRate = 1;
          } else if (selectedBetZone === "big" && sum >= 11 && sum <= 17) {
            isWin = true;
            payoutRate = 1;
          } else if (selectedBetZone === "odd" && sum % 2 !== 0) {
            isWin = true;
            payoutRate = 1;
          } else if (selectedBetZone === "even" && sum % 2 === 0) {
            isWin = true;
            payoutRate = 1;
          }
        }

        const delta = isWin ? betAmount * payoutRate : -betAmount;
        const newChips = chips + delta;
        updateChips(newChips);

        const resultLabel = `${values.join("-")} = ${sum}点 (${isTriple ? "围骰豹子" : sum >= 11 ? "大" : "小"}, ${sum % 2 !== 0 ? "单" : "双"})`;
        if (isWin) {
          setSicboMessage(`摇出：${resultLabel}。恭喜！你赢了 ${betAmount * payoutRate} 筹码！`);
          playWinSound();
        } else {
          setSicboMessage(`摇出：${resultLabel}。很遗憾，你输了 ${betAmount} 筹码。`);
          playThudSound(0.2);
        }

        setIsSicboRolling(false);
      },
      1400
    );
  };

  // Battle simulator
  const handleBattle = () => {
    if (chips < battleBet) {
      setBattleMessage("你的筹码不足以进行此次对决！");
      return;
    }

    setIsBattling(true);
    setBattleMessage("");
    setPlayerDice([]);
    setAiDice([]);

    triggerShakingAnimation(
      () => {},
      () => {
        const pRolls = Array.from({ length: 5 }, () => {
          const val = Math.floor(Math.random() * 6) + 1;
          const rx = Math.floor(Math.random() * 4) * 90 + 360 * 2;
          const ry = Math.floor(Math.random() * 4) * 90 + 360 * 2;
          return { type: "D6", max: 6, value: val, rotationX: rx, rotationY: ry } as RolledDiceResult;
        });

        const aRolls = Array.from({ length: 5 }, () => {
          const val = Math.floor(Math.random() * 6) + 1;
          const rx = Math.floor(Math.random() * 4) * 90 + 360 * 2;
          const ry = Math.floor(Math.random() * 4) * 90 + 360 * 2;
          return { type: "D6", max: 6, value: val, rotationX: rx, rotationY: ry } as RolledDiceResult;
        });

        setPlayerDice(pRolls);
        setAiDice(aRolls);

        const pValues = pRolls.map((d) => d.value);
        const aValues = aRolls.map((d) => d.value);

        const pHand = evaluateDiceHand(pValues);
        const aHand = evaluateDiceHand(aValues);

        let resultMsg = "";
        let delta = 0;

        if (pHand.rank > aHand.rank) {
          // Player wins
          delta = battleBet;
          resultMsg = `你以 【${pHand.name}】 击败了 AI 的 【${aHand.name}】！`;
          playWinSound();
        } else if (aHand.rank > pHand.rank) {
          // AI wins
          delta = -battleBet;
          resultMsg = `AI 以 【${aHand.name}】 击败了你的 【${pHand.name}】！`;
          playThudSound(0.2);
        } else {
          // Same combination, evaluate total points
          const pSum = pValues.reduce((s, v) => s + v, 0);
          const aSum = aValues.reduce((s, v) => s + v, 0);
          if (pSum > aSum) {
            delta = battleBet;
            resultMsg = `双方都是 【${pHand.name}】，但你总分更高 (${pSum} > ${aSum})！`;
            playWinSound();
          } else if (aSum > pSum) {
            delta = -battleBet;
            resultMsg = `双方都是 【${pHand.name}】，但 AI 总分更高 (${aSum} > ${pSum})！`;
            playThudSound(0.15);
          } else {
            resultMsg = `平局！双方都是 【${pHand.name}】且总分相同 (${pSum}点)。`;
          }
        }

        updateChips(chips + delta);
        setBattleMessage(resultMsg + (delta > 0 ? ` 赢取 ${delta} 筹码！` : delta < 0 ? ` 损失 ${Math.abs(delta)} 筹码。` : ""));
        setBattleHistory((prev) => [
          {
            player: `${pValues.join(", ")} (${pHand.name})`,
            ai: `${aValues.join(", ")} (${aHand.name})`,
            result: delta > 0 ? "胜" : delta < 0 ? "负" : "平"
          },
          ...prev
        ].slice(0, 15));

        setIsBattling(false);
      },
      1500
    );
  };

  const resetChips = () => {
    updateChips(1000);
    setSicboMessage("已领取 1000 救济筹码！");
  };

  const getD6FaceStyle = () => {
    const styles: Record<string, { rectFill: string; stroke: string; primaryDot: string; secondaryDot: string }> = {
      classic: { rectFill: "#ffffff", stroke: "#e3e3e3", primaryDot: "#ff4d4f", secondaryDot: "#2d3748" },
      cyberpunk: { rectFill: "#0d0015", stroke: "#00f0ff", primaryDot: "#ff007f", secondaryDot: "#00f0ff" },
      retro: { rectFill: "#2d3135", stroke: "#000000", primaryDot: "#ff6b6b", secondaryDot: "#4ecdc4" },
      forest: { rectFill: "#e1efe6", stroke: "#588157", primaryDot: "#2d5a27", secondaryDot: "#283618" },
      sunset: { rectFill: "#faeae6", stroke: "#f97316", primaryDot: "#d62828", secondaryDot: "#fcbf49" },
      cosmic: { rectFill: "#161226", stroke: "#a855f7", primaryDot: "#ec4899", secondaryDot: "#c084fc" }
    };
    return styles[theme] || styles.classic;
  };

  const getTableBg = () => {
    const tableBgs: Record<string, string> = {
      classic: "radial-gradient(circle, #0e5b32 0%, #063d20 100%)",
      cyberpunk: "radial-gradient(circle, #24003d 0%, #0d0015 100%)",
      retro: "#1a1c1e",
      forest: "radial-gradient(circle, #1e3c2c 0%, #0f1e16 100%)",
      sunset: "radial-gradient(circle, #4b2a22 0%, #251410 100%)",
      cosmic: "radial-gradient(circle, #211c38 0%, #0b0914 100%)"
    };
    return tableBgs[theme] || tableBgs.classic;
  };

  // Render D6 3D Cube Dice
  const render3DDice = (dice: RolledDiceResult, key: string | number) => {
    // Rotations map for values 1-6
    const rotX = dice.rotationX || 0;
    const rotY = dice.rotationY || 0;

    let targetRotX = rotX;
    let targetRotY = rotY;

    if (dice.value === 1) { targetRotX += 0; targetRotY += 0; }
    else if (dice.value === 2) { targetRotX += 0; targetRotY += 180; }
    else if (dice.value === 3) { targetRotX += 0; targetRotY += -90; }
    else if (dice.value === 4) { targetRotX += 0; targetRotY += 90; }
    else if (dice.value === 5) { targetRotX += -90; targetRotY += 0; }
    else if (dice.value === 6) { targetRotX += 90; targetRotY += 0; }

    const d6Style = getD6FaceStyle();

    return (
      <div key={key} className="dice-scene">
        <div
          className="cube-dice"
          style={{
            transform: `rotateX(${targetRotX}deg) rotateY(${targetRotY}deg)`
          }}
        >
          {/* Face 1: 1 red dot */}
          <div className="cube-face face-1">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill={d6Style.rectFill} stroke={d6Style.stroke} strokeWidth="1" />
              <circle cx="30" cy="30" r="7" fill={d6Style.primaryDot} />
            </svg>
          </div>
          {/* Face 2: 2 black dots */}
          <div className="cube-face face-2">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill={d6Style.rectFill} stroke={d6Style.stroke} strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="42" r="4.5" fill={d6Style.secondaryDot} />
            </svg>
          </div>
          {/* Face 3: 3 black dots */}
          <div className="cube-face face-3">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill={d6Style.rectFill} stroke={d6Style.stroke} strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="30" cy="30" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="42" r="4.5" fill={d6Style.secondaryDot} />
            </svg>
          </div>
          {/* Face 4: 4 red dots */}
          <div className="cube-face face-4">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill={d6Style.rectFill} stroke={d6Style.stroke} strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill={d6Style.primaryDot} />
              <circle cx="42" cy="18" r="4.5" fill={d6Style.primaryDot} />
              <circle cx="18" cy="42" r="4.5" fill={d6Style.primaryDot} />
              <circle cx="42" cy="42" r="4.5" fill={d6Style.primaryDot} />
            </svg>
          </div>
          {/* Face 5: 5 black dots */}
          <div className="cube-face face-5">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill={d6Style.rectFill} stroke={d6Style.stroke} strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="18" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="30" cy="30" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="18" cy="42" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="42" r="4.5" fill={d6Style.secondaryDot} />
            </svg>
          </div>
          {/* Face 6: 6 black dots */}
          <div className="cube-face face-6">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill={d6Style.rectFill} stroke={d6Style.stroke} strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="18" cy="30" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="18" cy="42" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="18" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="30" r="4.5" fill={d6Style.secondaryDot} />
              <circle cx="42" cy="42" r="4.5" fill={d6Style.secondaryDot} />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // Render Polyhedral Dice with outline SVGs and flashing animation
  const renderPolyhedralDice = (dice: RolledDiceResult, key: string | number) => {
    // Generate simple geometric shapes based on type
    let points = "";
    const colors = polyhedralColors[theme] || polyhedralColors.classic;
    let fill = colors[dice.type] || "#ffe066";
    let textY = "34";

    if (dice.type === "D4") {
      points = "30,5 5,52 55,52";
      textY = "38";
    } else if (dice.type === "D8") {
      points = "30,2 58,30 30,58 2,30";
    } else if (dice.type === "D10") {
      points = "30,2 55,18 45,50 30,58 15,50 5,18";
    } else if (dice.type === "D12") {
      points = "30,2 52,18 52,42 30,58 8,42 8,18";
    } else if (dice.type === "D20") {
      points = "30,2 58,16 48,50 12,50 2,16";
    } else if (dice.type === "D100") {
      // Draw as a circular shield / coin
      const strokeColor = colors.D100 || "#f59f00";
      return (
        <div key={key} style={{ width: "60px", height: "60px", margin: "10px", display: "inline-block", position: "relative" }}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill={theme === "retro" ? "#2d3135" : "#1e1b10"} stroke={strokeColor} strokeWidth="2.5" />
            <circle cx="30" cy="30" r="21" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3 3" />
            <text x="30" y="36" fill={strokeColor} fontSize="17" fontWeight="bold" textAnchor="middle">
              {dice.value}
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div key={key} style={{ width: "60px", height: "60px", margin: "10px", display: "inline-block", position: "relative" }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <polygon
            points={points}
            fill={theme === "retro" ? "#2d3135" : "#1e1e24"}
            stroke={fill}
            strokeWidth={theme === "retro" ? "3" : "2"}
          />
          <text
            x="30"
            y={textY}
            fill={fill}
            fontSize="18"
            fontWeight="bold"
            textAnchor="middle"
          >
            {dice.value}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <section className={`tool-panel theme-${theme}`}>
      {/* 3D Dice styling in scoped CSS style tag */}
      <style>{`
        /* Cube setup */
        .dice-scene {
          width: 60px;
          height: 60px;
          margin: 10px;
          perspective: 300px;
          display: inline-block;
        }

        .cube-dice {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.3, 1.1);
        }

        .cube-face {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 8px;
          backface-visibility: hidden;
        }

        /* 3D rotations */
        .face-1 { transform: rotateY(0deg) translateZ(30px); }
        .face-2 { transform: rotateY(180deg) translateZ(30px); }
        .face-3 { transform: rotateY(90deg) translateZ(30px); }
        .face-4 { transform: rotateY(-90deg) translateZ(30px); }
        .face-5 { transform: rotateX(90deg) translateZ(30px); }
        .face-6 { transform: rotateX(-90deg) translateZ(30px); }

        /* Animation */
        .shaking-cup-anim {
          animation: cupShake 0.15s infinite;
        }

        @keyframes cupShake {
          0% { transform: translate(2px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }

        /* Inputs and Textareas global themed styling override */
        .tool-panel {
          color: var(--text-primary, #ffffff) !important;
        }
        .tool-panel h3, .tool-panel h4 {
          color: var(--text-primary, #ffffff) !important;
        }

        .tool-panel input, .tool-panel textarea {
          background: var(--input-bg, #1a1c1e) !important;
          color: var(--text-primary, #ffffff) !important;
          border: 1px solid var(--input-border, #2d2d30) !important;
          border-radius: 4px;
        }
        .tool-panel input:focus, .tool-panel textarea:focus {
          border-color: var(--accent-primary, #ffe066) !important;
          outline: none;
        }

        /* Config plus-minus buttons */
        .config-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-muted, #2d2d30) !important;
          color: var(--text-primary, #ffffff) !important;
          border: 1px solid var(--border-default, #2d2d30) !important;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.15s;
        }
        .config-btn:hover:not(:disabled) {
          border-color: var(--accent-primary, #ffe066) !important;
          background: var(--card-hover-bg, #3d4349) !important;
        }
        .config-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tool-panel.theme-classic {
          --bg-base: #080f19;
          --bg-subtle: #0d1826;
          --bg-muted: #14243a;
          --border-default: rgba(255, 224, 102, 0.12);
          --border-subtle: rgba(255, 224, 102, 0.06);
          --border-strong: rgba(255, 224, 102, 0.22);
          --accent-primary: #ffe066;
          --accent-primary-dim: rgba(255, 224, 102, 0.1);
          --text-primary: #ffffff;
          --text-secondary: #a0abba;
          --card-bg: rgba(13, 24, 38, 0.78);
          --card-border: rgba(255, 224, 102, 0.09);
          --card-hover-bg: rgba(20, 35, 55, 0.92);
          --card-hover-border: rgba(255, 159, 67, 0.22);
          --input-bg: rgba(8, 15, 25, 0.82);
          --input-border: rgba(255, 224, 102, 0.14);
        }

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
        <p style={{ marginTop: "0.5rem" }}>提供多面体骰子掷骰平台，以及经典的骰宝（Guess Big/Small）和骰子大对决（Dice Poker Battle）迷你游戏。</p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-default)", marginBottom: "1.25rem" }}>
        <button
          type="button"
          disabled={isFreeRolling || isSicboRolling || isBattling}
          onClick={() => setActiveTab("free")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "free" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "none",
            color: activeTab === "free" ? (themeConfig[theme]?.primary || "#ffe066") : "var(--text-secondary)",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "-2px"
          }}
        >
          🎲 自由投掷
        </button>
        <button
          type="button"
          disabled={isFreeRolling || isSicboRolling || isBattling}
          onClick={() => setActiveTab("sicbo")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "sicbo" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "none",
            color: activeTab === "sicbo" ? (themeConfig[theme]?.primary || "#ffe066") : "var(--text-secondary)",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "-2px"
          }}
        >
          🏺 趣味骰宝
        </button>
        <button
          type="button"
          disabled={isFreeRolling || isSicboRolling || isBattling}
          onClick={() => setActiveTab("battle")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "battle" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "none",
            color: activeTab === "battle" ? (themeConfig[theme]?.primary || "#ffe066") : "var(--text-secondary)",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "-2px"
          }}
        >
          ⚔️ 骰子对决
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "0.9rem", color: themeConfig[theme]?.primary || "#ffe066", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            🪙 <span>我的筹码: <strong>{chips}</strong></span>
            {chips < 100 && (
              <button type="button" onClick={resetChips} style={{ padding: "2px 8px", fontSize: "0.75rem", background: "var(--accent-danger)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>领低保</button>
            )}
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            🔊 声音反馈
          </label>
        </div>
      </div>

      {/* Mode 1: Free Roll */}
      {activeTab === "free" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Config column */}
          <div style={{ background: themeConfig[theme]?.bgCard || "#1e1e24", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, borderBottom: "1px solid var(--border-default)", paddingBottom: "0.5rem" }}>选择你的骰子组合</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(["D4", "D6", "D8", "D10", "D12", "D20", "D100"] as DiceType[]).map((type) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0" }}>
                  <span style={{ fontWeight: "bold" }}>
                    {type} <span style={{ fontSize: "0.8rem", fontWeight: "normal", opacity: 0.6 }}>({type === "D6" ? "3D立方体" : "多面体"})</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button type="button" className="config-btn" disabled={isFreeRolling} onClick={() => changeFreeConfig(type, -1)}>-</button>
                    <span style={{ width: "20px", textAlign: "center", fontWeight: "bold", color: "var(--text-primary)" }}>{freeDiceConfigs[type]}</span>
                    <button type="button" className="config-btn" disabled={isFreeRolling} onClick={() => changeFreeConfig(type, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={isFreeRolling}
              onClick={handleFreeRoll}
              style={{
                backgroundColor: themeConfig[theme]?.primary || "#ffe066",
                color: themeConfig[theme]?.buttonText || "#121214",
                fontWeight: "bold",
                padding: "0.75rem",
                fontSize: "1rem"
              }}
            >
              {isFreeRolling ? "正在晃动骰子..." : "开始投掷骰子"}
            </button>
          </div>

          {/* Results column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "1.5rem", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
              <h4 style={{ position: "absolute", top: "0.75rem", left: "0.75rem", margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.5 }}>
                🎲 投掷落地区
              </h4>

              {freeRollResults.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
                  {isFreeRolling ? "骰子在杯中剧烈晃动，准备掷出！" : "暂无投掷，请在左侧选择骰子数并投掷"}
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem", width: "100%" }}>
                  {freeRollResults.map((dice, idx) =>
                    dice.type === "D6" ? render3DDice(dice, idx) : renderPolyhedralDice(dice, idx)
                  )}
                </div>
              )}
            </div>

            {/* Stats and Log */}
            {freeRollResults.length > 0 && !isFreeRolling && (
              <div className="detail-grid">
                <article className="detail-card"><h3>骰子总数</h3><p>{freeRollStats.count} 个</p></article>
                <article className="detail-card"><h3>总分数</h3><p>{freeRollStats.total} 分</p></article>
                <article className="detail-card"><h3>平均分</h3><p>{freeRollStats.avg} 分/个</p></article>
              </div>
            )}

            <div style={{ background: themeConfig[theme]?.bgCard || "#1e1e24", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>掷骰历史</h4>
              <textarea
                readOnly
                value={history.join("\n")}
                placeholder="历史记录为空"
                rows={5}
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Sic Bo (骰宝) */}
      {activeTab === "sicbo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Casino Felt Layout */}
          <div
            style={{
              background: getTableBg(),
              border: `4px solid ${themeConfig[theme]?.primary || "#ffe066"}`,
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: theme === "retro" ? "none" : "0 10px 25px rgba(0,0,0,0.5)",
              color: "#ffffff"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1rem", borderBottom: "1px dashed rgba(255, 254, 102, 0.3)", paddingBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: themeConfig[theme]?.primary || "#ffe066", letterSpacing: "2px" }}>🏆 经典骰宝 🏺</span>
            </div>

            {/* Betting Board Areas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {/* Small Bet */}
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("small")}
                style={{
                  background: selectedBetZone === "small" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.3)",
                  border: selectedBetZone === "small" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "1.5px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: themeConfig[theme]?.secondary || "#ff9f43" }}>小</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>4 - 10 点</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(1 赔 1，豹子庄家吃)</span>
              </button>

              {/* Even Bet */}
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("even")}
                style={{
                  background: selectedBetZone === "even" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.3)",
                  border: selectedBetZone === "even" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "1.5px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "1.8rem", fontWeight: "bold" }}>双</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>双数点数和</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(1 赔 1，豹子庄家吃)</span>
              </button>

              {/* Odd Bet */}
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("odd")}
                style={{
                  background: selectedBetZone === "odd" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.3)",
                  border: selectedBetZone === "odd" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "1.5px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "1.8rem", fontWeight: "bold" }}>单</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>单数点数和</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(1 赔 1，豹子庄家吃)</span>
              </button>

              {/* Big Bet */}
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("big")}
                style={{
                  background: selectedBetZone === "big" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.3)",
                  border: selectedBetZone === "big" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : "1.5px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: themeConfig[theme]?.secondary || "#ff9f43" }}>大</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>11 - 17 点</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(1 赔 1，豹子庄家吃)</span>
              </button>
            </div>

            {/* Leopard Triple Bet Area */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("triple")}
                style={{
                  background: selectedBetZone === "triple" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.4)",
                  border: selectedBetZone === "triple" ? `2px solid ${themeConfig[theme]?.primary || "#ffe066"}` : `1.5px dashed ${themeConfig[theme]?.primary || "#ffe066"}66`,
                  borderRadius: "8px",
                  padding: "0.75rem 2rem",
                  color: themeConfig[theme]?.primary || "#ffe066",
                  width: "100%",
                  maxWidth: "400px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "1.4rem", fontWeight: "bold" }}>🐆 豹子 (任意全围) 🐆</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "2px" }}>三个骰子点数完全相同 (如 4-4-4)</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>(1 赔 30)</span>
              </button>
            </div>

            {/* Shaking Tray Visual area */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "1.5rem 0", position: "relative" }}>
              <div
                style={{
                  width: "280px",
                  height: "130px",
                  background: theme === "cyberpunk" ? "radial-gradient(circle, #3a005c 0%, #110022 100%)" :
                              theme === "forest" ? "radial-gradient(circle, #2d5a27 0%, #0d1e13 100%)" :
                              theme === "sunset" ? "radial-gradient(circle, #f97316 0%, #251410 100%)" :
                              theme === "cosmic" ? "radial-gradient(circle, #a855f7 0%, #0b0914 100%)" :
                              theme === "retro" ? "#2d3135" :
                              "radial-gradient(circle, #ffe399 0%, #d4af37 100%)",
                  border: `5px solid ${theme === "retro" ? "#000" : "#8c6b12"}`,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 15px rgba(0,0,0,0.4)",
                  position: "relative"
                }}
              >
                {/* Rolling Dice under/inside tray */}
                {cupState !== "opened" ? (
                  <div className={cupState === "shaking" ? "shaking-cup-anim" : ""} style={{ position: "absolute", zIndex: 10 }}>
                    {/* Visual Golden Cup */}
                    <svg width="100" height="90" viewBox="0 0 100 90">
                      <ellipse cx="50" cy="80" rx="35" ry="10" fill="#6b510c" />
                      <path d="M15,30 C15,80 85,80 85,30 L80,10 C80,10 50,0 20,10 Z" style={{ fill: themeConfig[theme]?.primary || "#d4af37", stroke: themeConfig[theme]?.secondary || "#e3c26d", strokeWidth: 1.5 }} fill="linear-gradient(#f5d76e, #f39c12)" />
                      <circle cx="50" cy="15" r="10" fill={themeConfig[theme]?.secondary || "#d4af37"} stroke={themeConfig[theme]?.primary} />
                    </svg>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: "0.5rem", zIndex: 1 }}>
                  {sicboDice.map((dice, idx) => render3DDice(dice, idx))}
                </div>
              </div>

              {cupState === "shaking" && (
                <p style={{ color: themeConfig[theme]?.primary || "#ffe066", fontWeight: "bold", fontSize: "1.1rem", animation: "pulse 1s infinite", marginTop: "1rem" }}>
                  🔊 哗啦哗啦，正在疯狂摇晃...
                </p>
              )}
            </div>

            {/* Message Bar */}
            {sicboMessage && (
              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "6px", textAlign: "center", margin: "1rem 0" }}>
                <p style={{ margin: 0, fontWeight: "bold", color: sicboMessage.includes("赢") ? (themeConfig[theme]?.primary || "#ffe066") : "#ff8787" }}>
                  {sicboMessage}
                </p>
              </div>
            )}

            {/* Bet Controllers */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>单次投注筹码：</span>
                <input
                  type="number"
                  min={10}
                  max={Math.max(10, chips)}
                  value={betAmount}
                  disabled={isSicboRolling}
                  onChange={(e) => setBetAmount(Math.max(10, Math.min(chips, Number(e.target.value) || 10)))}
                  style={{ width: "80px", padding: "4px", background: "rgba(0,0,0,0.4)", border: `1px solid ${themeConfig[theme]?.primary || "#ffe066"}`, color: "#fff", fontWeight: "bold" }}
                />
                <button type="button" disabled={isSicboRolling} onClick={() => setBetAmount(50)} style={{ padding: "2px 6px", fontSize: "0.8rem", background: "rgba(0,0,0,0.3)" }}>50</button>
                <button type="button" disabled={isSicboRolling} onClick={() => setBetAmount(100)} style={{ padding: "2px 6px", fontSize: "0.8rem", background: "rgba(0,0,0,0.3)" }}>100</button>
                <button type="button" disabled={isSicboRolling} onClick={() => setBetAmount(500)} style={{ padding: "2px 6px", fontSize: "0.8rem", background: "rgba(0,0,0,0.3)" }}>500</button>
                <button type="button" disabled={isSicboRolling} onClick={() => setBetAmount(chips)} style={{ padding: "2px 6px", fontSize: "0.8rem", background: "rgba(0,0,0,0.3)" }}>梭哈</button>
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  disabled={isSicboRolling || selectedBetZone === null}
                  onClick={handleSicboRoll}
                  style={{
                    backgroundColor: themeConfig[theme]?.primary || "#ffe066",
                    color: themeConfig[theme]?.buttonText || "#121214",
                    fontWeight: "bold",
                    padding: "0.6rem 2.5rem",
                    border: "none",
                    borderRadius: "6px",
                    cursor: (isSicboRolling || selectedBetZone === null) ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                  }}
                >
                  {isSicboRolling ? "掷骰中..." : `开始摇骰 (${selectedBetZone ? `押${selectedBetZone === "big" ? "大" : selectedBetZone === "small" ? "小" : selectedBetZone === "odd" ? "单" : selectedBetZone === "even" ? "双" : "豹子"}` : "未押注"})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Battle */}
      {activeTab === "battle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: themeConfig[theme]?.bgCard || "#1e1e24", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--border-default)" }}>
            <h3 style={{ margin: "0 0 1rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚔️ 骰子手牌大对决 (Dice Poker Battle)</span>
              <span style={{ fontSize: "0.85rem", opacity: 0.7, fontWeight: "normal" }}>规则：各自投掷 5 颗骰子，对比成牌组合（如顺子、豹子、一对）大小。</span>
            </h3>

            {/* Arena Board */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "1.5rem" }}>
              {/* Player Side */}
              <div style={{ background: "var(--bg-base)", borderRadius: "8px", padding: "1rem", textAlign: "center", border: `1.5px solid ${themeConfig[theme]?.primary || "#ffe066"}` }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: themeConfig[theme]?.primary || "#ffe066" }}>👨 你的骰子 (PLAYER)</h4>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", minHeight: "80px", alignItems: "center" }}>
                  {playerDice.length === 0 ? (
                    <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem" }}>等待投掷...</p>
                  ) : (
                    playerDice.map((d, idx) => render3DDice(d, `p_${idx}`))
                  )}
                </div>
                {playerDice.length > 0 && (
                  <p style={{ fontWeight: "bold", color: themeConfig[theme]?.secondary || "#ff9f43", marginTop: "0.5rem" }}>
                    手牌牌型：{evaluateDiceHand(playerDice.map(d => d.value)).name}
                  </p>
                )}
              </div>

              {/* AI Side */}
              <div style={{ background: "var(--bg-base)", borderRadius: "8px", padding: "1rem", textAlign: "center", border: `1.5px solid ${themeConfig[theme]?.secondary || "#ff8787"}` }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: themeConfig[theme]?.secondary || "#ff8787" }}>🤖 对手 AI 骰子</h4>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", minHeight: "80px", alignItems: "center" }}>
                  {aiDice.length === 0 ? (
                    <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem" }}>等待投掷...</p>
                  ) : (
                    aiDice.map((d, idx) => render3DDice(d, `a_${idx}`))
                  )}
                </div>
                {aiDice.length > 0 && (
                  <p style={{ fontWeight: "bold", color: themeConfig[theme]?.secondary || "#ff9f43", marginTop: "0.5rem" }}>
                    手牌牌型：{evaluateDiceHand(aiDice.map(d => d.value)).name}
                  </p>
                )}
              </div>
            </div>

            {/* Results announcement */}
            {battleMessage && (
              <div style={{ background: themeConfig[theme]?.accentDim || "rgba(255,224,102,0.05)", border: `1px dashed ${themeConfig[theme]?.primary || "#ffe066"}`, padding: "0.75rem", borderRadius: "6px", textAlign: "center", marginBottom: "1rem" }}>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.1rem" }}>
                  {battleMessage}
                </p>
              </div>
            )}

            {/* Control Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>投注筹码：</span>
                <input
                  type="number"
                  min={10}
                  max={chips}
                  value={battleBet}
                  disabled={isBattling}
                  onChange={(e) => setBattleBet(Math.max(10, Math.min(chips, Number(e.target.value) || 10)))}
                  style={{ width: "80px", padding: "4px" }}
                />
              </div>

              <button
                type="button"
                disabled={isBattling || chips < battleBet}
                onClick={handleBattle}
                style={{
                  backgroundColor: themeConfig[theme]?.primary || "#ffe066",
                  color: themeConfig[theme]?.buttonText || "#121214",
                  fontWeight: "bold",
                  padding: "0.6rem 2.5rem",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                {isBattling ? "摇晃中..." : "与 AI 决斗！"}
              </button>
            </div>

            {/* Match History logs */}
            {battleHistory.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>对决历史战绩</h4>
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border-default)", borderRadius: "6px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-muted)" }}>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-default)" }}>轮次</th>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-default)" }}>玩家点数及成牌</th>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-default)" }}>AI点数及成牌</th>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-default)" }}>结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battleHistory.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #2d2d30" }}>
                          <td style={{ padding: "6px 12px" }}>#{battleHistory.length - i}</td>
                          <td style={{ padding: "6px 12px" }}>{h.player}</td>
                          <td style={{ padding: "6px 12px" }}>{h.ai}</td>
                          <td style={{ padding: "6px 12px", fontWeight: "bold", color: h.result === "胜" ? "#4ade80" : h.result === "负" ? "#ff8787" : "#e3e3e3" }}>
                            {h.result}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
