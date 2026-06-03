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

export default function DiceRollerTool({ manifest }: ToolAppProps) {
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

  // Helper to roll a single dice
  const rollSingleDice = (type: DiceType): RolledDiceResult => {
    const maxMap: Record<DiceType, number> = {
      D4: 4,
      D6: 6,
      D8: 8,
      D10: 10,
      D12: 12,
      D20: 20,
      D100: 100
    };
    const max = maxMap[type];
    const val = Math.floor(Math.random() * max) + 1;

    // Generate random 3D rotations for D6 (multiple rotations + target face rotation)
    const baseRotations = 4 * 360;
    const rx = baseRotations + (Math.floor(Math.random() * 4) * 90);
    const ry = baseRotations + (Math.floor(Math.random() * 4) * 90);

    return {
      type,
      max,
      value: val,
      rotationX: rx,
      rotationY: ry
    };
  };

  // 1. Free Roll Logic
  const handleFreeRoll = () => {
    if (isFreeRolling) return;
    
    // Accumulate total dice selected
    const activeConfigs: { type: DiceType; count: number }[] = [];
    Object.keys(freeDiceConfigs).forEach((key) => {
      const type = key as DiceType;
      const count = freeDiceConfigs[type];
      if (count > 0) activeConfigs.push({ type, count });
    });

    if (activeConfigs.length === 0) {
      alert("请至少添加一个骰子进行投掷。");
      return;
    }

    setIsFreeRolling(true);
    setFreeRollResults([]);

    // Shaking loop sound
    let ticksCount = 0;
    const timer = setInterval(() => {
      playRattleTick();
      ticksCount++;
      if (ticksCount >= 15) {
        clearInterval(timer);
      }
    }, 80);

    setTimeout(() => {
      const results: RolledDiceResult[] = [];
      activeConfigs.forEach((cfg) => {
        for (let i = 0; i < cfg.count; i++) {
          results.push(rollSingleDice(cfg.type));
        }
      });

      setFreeRollResults(results);
      setIsFreeRolling(false);
      playThudSound(0.2);

      // Record to history
      const totalPoints = results.reduce((sum, d) => sum + d.value, 0);
      const detail = results.map((r) => `${r.type}(${r.value})`).join(", ");
      const timeStr = new Date().toLocaleTimeString();
      setHistory((prev) => [
        `[${timeStr}] 自由投掷: 共 ${results.length} 个骰子，总分: ${totalPoints}。 (${detail})`,
        ...prev
      ].slice(0, 30));
    }, 1200);
  };

  // Adjust counters for Free Roll
  const changeFreeConfig = (type: DiceType, delta: number) => {
    if (isFreeRolling) return;
    setFreeDiceConfigs((prev) => {
      const current = prev[type];
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [type]: next };
    });
  };

  // Calculate stats for Free Roll
  const freeRollStats = useMemo(() => {
    const total = freeRollResults.reduce((sum, d) => sum + d.value, 0);
    const count = freeRollResults.length;
    const avg = count > 0 ? (total / count).toFixed(1) : "0";
    return { total, count, avg };
  }, [freeRollResults]);


  // 2. Sic Bo (骰宝) Game Logic
  const handleSicboRoll = () => {
    if (isSicboRolling) return;
    if (selectedBetZone === null) {
      setSicboMessage("请选择一个投注区域！");
      return;
    }
    if (betAmount <= 0 || betAmount > chips) {
      setSicboMessage("筹码余额不足或投注不合法！");
      return;
    }

    setIsSicboRolling(true);
    setCupState("shaking");
    setSicboMessage("");

    // Rattling sound interval
    let ticks = 0;
    const shakeTimer = setInterval(() => {
      playRattleTick();
      ticks++;
      if (ticks >= 18) clearInterval(shakeTimer);
    }, 80);

    setTimeout(() => {
      setCupState("closed");
      // Calculate results
      const roll1 = rollSingleDice("D6");
      const roll2 = rollSingleDice("D6");
      const roll3 = rollSingleDice("D6");
      const rolled = [roll1, roll2, roll3];
      setSicboDice(rolled);

      const total = roll1.value + roll2.value + roll3.value;
      const isTriple = roll1.value === roll2.value && roll2.value === roll3.value;
      
      let outcome: "big" | "small" | "odd" | "even" | "triple" | "none" = "none";
      if (isTriple) {
        outcome = "triple";
      } else {
        if (total >= 11 && total <= 17) outcome = "big";
        else if (total >= 4 && total <= 10) outcome = "small";
      }

      const isOdd = total % 2 !== 0 && !isTriple;
      const isEven = total % 2 === 0 && !isTriple;

      let won = false;
      let multiplier = 0;

      if (selectedBetZone === "big" && outcome === "big") {
        won = true;
        multiplier = 1;
      } else if (selectedBetZone === "small" && outcome === "small") {
        won = true;
        multiplier = 1;
      } else if (selectedBetZone === "odd" && isOdd) {
        won = true;
        multiplier = 1;
      } else if (selectedBetZone === "even" && isEven) {
        won = true;
        multiplier = 1;
      } else if (selectedBetZone === "triple" && outcome === "triple") {
        won = true;
        multiplier = 30; // 30x payout for any triple
      }

      setCupState("opened");
      playThudSound(0.25);

      let delta = -betAmount;
      if (won) {
        delta = betAmount * multiplier;
        updateChips(chips + delta);
        setSicboMessage(`🎉 骰子结果: ${roll1.value}, ${roll2.value}, ${roll3.value} | 共 ${total} 点 [${isTriple ? "豹子" : (total >= 11 ? "大" : "小")}]。你赢了 ${delta} 筹码！`);
        playWinSound();
      } else {
        updateChips(chips + delta);
        setSicboMessage(`😢 骰子结果: ${roll1.value}, ${roll2.value}, ${roll3.value} | 共 ${total} 点 [${isTriple ? "豹子" : (total >= 11 ? "大" : "小")}]。很遗憾，落空了。损失 ${betAmount} 筹码！`);
      }

      setIsSicboRolling(false);
    }, 1600);
  };


  // 3. Battle Game Logic
  const handleBattle = () => {
    if (isBattling) return;
    if (battleBet <= 0 || battleBet > chips) {
      setBattleMessage("筹码余额不足，无法进行对决！");
      return;
    }

    setIsBattling(true);
    setBattleMessage("正在摇晃骰子...");

    let ticks = 0;
    const timer = setInterval(() => {
      playRattleTick();
      ticks++;
      if (ticks >= 15) clearInterval(timer);
    }, 85);

    setTimeout(() => {
      // 5 dice for player, 5 for AI
      const pRolls = Array.from({ length: 5 }, () => rollSingleDice("D6"));
      const aRolls = Array.from({ length: 5 }, () => rollSingleDice("D6"));

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
    }, 1500);
  };

  const resetChips = () => {
    updateChips(1000);
    setSicboMessage("已领取 1000 救济筹码！");
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
              <rect x="2" y="2" width="56" height="56" rx="8" fill="#ffffff" stroke="#e3e3e3" strokeWidth="1" />
              <circle cx="30" cy="30" r="7" fill="#ff4d4f" />
            </svg>
          </div>
          {/* Face 2: 2 black dots */}
          <div className="cube-face face-2">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill="#ffffff" stroke="#e3e3e3" strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="42" r="4.5" fill="#2d3748" />
            </svg>
          </div>
          {/* Face 3: 3 black dots */}
          <div className="cube-face face-3">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill="#ffffff" stroke="#e3e3e3" strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill="#2d3748" />
              <circle cx="30" cy="30" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="42" r="4.5" fill="#2d3748" />
            </svg>
          </div>
          {/* Face 4: 4 red dots */}
          <div className="cube-face face-4">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill="#ffffff" stroke="#e3e3e3" strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill="#ff4d4f" />
              <circle cx="42" cy="18" r="4.5" fill="#ff4d4f" />
              <circle cx="18" cy="42" r="4.5" fill="#ff4d4f" />
              <circle cx="42" cy="42" r="4.5" fill="#ff4d4f" />
            </svg>
          </div>
          {/* Face 5: 5 black dots */}
          <div className="cube-face face-5">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill="#ffffff" stroke="#e3e3e3" strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="18" r="4.5" fill="#2d3748" />
              <circle cx="30" cy="30" r="4.5" fill="#2d3748" />
              <circle cx="18" cy="42" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="42" r="4.5" fill="#2d3748" />
            </svg>
          </div>
          {/* Face 6: 6 black dots */}
          <div className="cube-face face-6">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="2" y="2" width="56" height="56" rx="8" fill="#ffffff" stroke="#e3e3e3" strokeWidth="1" />
              <circle cx="18" cy="18" r="4.5" fill="#2d3748" />
              <circle cx="18" cy="30" r="4.5" fill="#2d3748" />
              <circle cx="18" cy="42" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="18" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="30" r="4.5" fill="#2d3748" />
              <circle cx="42" cy="42" r="4.5" fill="#2d3748" />
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
    let fill = "#ffe066";
    let textY = "34";

    if (dice.type === "D4") {
      points = "30,5 5,52 55,52";
      fill = "#ff6b6b";
      textY = "38";
    } else if (dice.type === "D8") {
      points = "30,2 58,30 30,58 2,30";
      fill = "#4dadf7";
    } else if (dice.type === "D10") {
      points = "30,2 55,18 45,50 30,58 15,50 5,18";
      fill = "#74b816";
    } else if (dice.type === "D12") {
      points = "30,2 52,18 52,42 30,58 8,42 8,18";
      fill = "#ae3ec9";
    } else if (dice.type === "D20") {
      points = "30,2 58,16 48,50 12,50 2,16";
      fill = "#f59f00";
    } else if (dice.type === "D100") {
      // Draw as a circular shield / coin
      return (
        <div key={key} style={{ width: "60px", height: "60px", margin: "10px", display: "inline-block", position: "relative" }}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="#1e1b10" stroke="#f59f00" strokeWidth="2.5" />
            <circle cx="30" cy="30" r="21" fill="none" stroke="#f59f00" strokeWidth="1" strokeDasharray="3 3" />
            <text x="30" y="36" fill="#f59f00" fontSize="17" fontWeight="bold" textAnchor="middle">
              {dice.value}
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div key={key} style={{ width: "60px", height: "60px", margin: "10px", display: "inline-block" }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <polygon points={points} fill="#1e1e24" stroke={fill} strokeWidth="2.5" />
          <text x="30" y={textY} fill="#e3e3e3" fontSize="15" fontWeight="bold" textAnchor="middle">
            {dice.value}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <section className="tool-panel">
      {/* Self-contained CSS styles for 3D and other effects */}
      <style>{`
        .dice-scene {
          width: 60px;
          height: 60px;
          perspective: 250px;
          margin: 8px;
          display: inline-block;
        }
        .cube-dice {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 1.2s cubic-bezier(0.25, 0.8, 0.25, 1.05);
        }
        .cube-face {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 8px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.1);
        }
        .face-1 { transform: rotateY(0deg) translateZ(30px); }
        .face-2 { transform: rotateY(180deg) translateZ(30px); }
        .face-3 { transform: rotateY(90deg) translateZ(30px); }
        .face-4 { transform: rotateY(-90deg) translateZ(30px); }
        .face-5 { transform: rotateX(90deg) translateZ(30px); }
        .face-6 { transform: rotateX(-90deg) translateZ(30px); }

        .shaking-cup-anim {
          animation: shakeCup 0.6s infinite;
        }

        @keyframes shakeCup {
          0% { transform: translate(0, 0) rotate(0deg); }
          15% { transform: translate(-8px, 6px) rotate(-6deg); }
          30% { transform: translate(8px, -6px) rotate(6deg); }
          45% { transform: translate(-8px, -4px) rotate(-6deg); }
          60% { transform: translate(8px, 8px) rotate(6deg); }
          75% { transform: translate(-4px, 8px) rotate(-4deg); }
          90% { transform: translate(4px, -8px) rotate(4deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}</style>

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">游戏娱乐工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>提供多面体骰子掷骰平台，以及经典的骰宝（Guess Big/Small）和骰子大对决（Dice Poker Battle）迷你游戏。</p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", borderBottom: "2px solid #2d2d30", marginBottom: "1.25rem" }}>
        <button
          type="button"
          disabled={isFreeRolling || isSicboRolling || isBattling}
          onClick={() => setActiveTab("free")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "free" ? "2px solid #ffe066" : "none",
            color: activeTab === "free" ? "#ffe066" : "#8e8e93",
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
            borderBottom: activeTab === "sicbo" ? "2px solid #ffe066" : "none",
            color: activeTab === "sicbo" ? "#ffe066" : "#8e8e93",
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
            borderBottom: activeTab === "battle" ? "2px solid #ffe066" : "none",
            color: activeTab === "battle" ? "#ffe066" : "#8e8e93",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "-2px"
          }}
        >
          ⚔️ 骰子对决
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "0.9rem", color: "#ffe066", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            🪙 <span>我的筹码: <strong>{chips}</strong></span>
            {chips < 100 && (
              <button type="button" onClick={resetChips} style={{ padding: "1px 6px", fontSize: "0.75rem", background: "#d9480f" }}>领低保</button>
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
          <div style={{ background: "#1e1e24", padding: "1.25rem", borderRadius: "8px", border: "1px solid #2d2d30", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, borderBottom: "1px solid #2d2d30", paddingBottom: "0.5rem" }}>选择你的骰子组合</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(["D4", "D6", "D8", "D10", "D12", "D20", "D100"] as DiceType[]).map((type) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0" }}>
                  <span style={{ fontWeight: "bold" }}>
                    {type} <span style={{ fontSize: "0.8rem", fontWeight: "normal", opacity: 0.6 }}>({type === "D6" ? "3D立方体" : "多面体"})</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button type="button" disabled={isFreeRolling} onClick={() => changeFreeConfig(type, -1)} style={{ width: "24px", height: "24px", padding: 0 }}>-</button>
                    <span style={{ width: "20px", textAlign: "center", fontWeight: "bold" }}>{freeDiceConfigs[type]}</span>
                    <button type="button" disabled={isFreeRolling} onClick={() => changeFreeConfig(type, 1)} style={{ width: "24px", height: "24px", padding: 0 }}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="btn-primary" disabled={isFreeRolling} onClick={handleFreeRoll} style={{ backgroundColor: "#ffe066", color: "#121214", fontWeight: "bold", padding: "0.75rem", fontSize: "1rem" }}>
              {isFreeRolling ? "正在晃动骰子..." : "开始投掷骰子"}
            </button>
          </div>

          {/* Results column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "#121214", border: "1px solid #2d2d30", borderRadius: "8px", padding: "1.5rem", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
              <h4 style={{ position: "absolute", top: "0.75rem", left: "0.75rem", margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.5 }}>
                🎲 投掷落地区
              </h4>

              {freeRollResults.length === 0 ? (
                <p style={{ color: "#8e8e93", textAlign: "center" }}>
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

            <div style={{ background: "#1e1e24", border: "1px solid #2d2d30", borderRadius: "8px", padding: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>掷骰历史</h4>
              <textarea
                readOnly
                value={history.join("\n")}
                placeholder="历史记录为空"
                rows={5}
                style={{ fontSize: "0.85rem", background: "#121214", border: "1px solid #2d2d30" }}
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
              background: "radial-gradient(circle, #0e5b32 0%, #063d20 100%)",
              border: "4px solid #ffe066",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              color: "#ffffff"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1rem", borderBottom: "1px dashed rgba(255, 254, 102, 0.3)", paddingBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#ffe066", letterSpacing: "2px" }}>🏆 经典骰宝 🏺</span>
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
                  border: selectedBetZone === "small" ? "2px solid #ffe066" : "1.5px solid rgba(255,255,255,0.2)",
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
                <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ffe066" }}>小</span>
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
                  border: selectedBetZone === "even" ? "2px solid #ffe066" : "1.5px solid rgba(255,255,255,0.2)",
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
                <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#e3e3e3" }}>双</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>双数和</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(1 赔 1，豹子庄家吃)</span>
              </button>

              {/* Odd Bet */}
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("odd")}
                style={{
                  background: selectedBetZone === "odd" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.3)",
                  border: selectedBetZone === "odd" ? "2px solid #ffe066" : "1.5px solid rgba(255,255,255,0.2)",
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
                <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#e3e3e3" }}>单</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "4px" }}>单数和</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(1 赔 1，豹子庄家吃)</span>
              </button>

              {/* Big Bet */}
              <button
                type="button"
                disabled={isSicboRolling}
                onClick={() => setSelectedBetZone("big")}
                style={{
                  background: selectedBetZone === "big" ? "rgba(255, 224, 102, 0.25)" : "rgba(0,0,0,0.3)",
                  border: selectedBetZone === "big" ? "2px solid #ffe066" : "1.5px solid rgba(255,255,255,0.2)",
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
                <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ff6b6b" }}>大</span>
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
                  border: selectedBetZone === "triple" ? "2px solid #ffe066" : "1.5px dashed rgba(255, 224, 102, 0.4)",
                  borderRadius: "8px",
                  padding: "0.75rem 2rem",
                  color: "#ffe066",
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
                  background: "radial-gradient(circle, #ffe399 0%, #d4af37 100%)",
                  border: "5px solid #8c6b12",
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
                      <path d="M15,30 C15,80 85,80 85,30 L80,10 C80,10 50,0 20,10 Z" fill="linear-gradient(#f5d76e, #f39c12)" style={{ fill: "#b89025", stroke: "#e3c26d", strokeWidth: 1.5 }} />
                      <circle cx="50" cy="15" r="10" fill="#d4af37" stroke="#e3c26d" />
                    </svg>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: "0.5rem", zIndex: 1 }}>
                  {sicboDice.map((dice, idx) => render3DDice(dice, idx))}
                </div>
              </div>

              {cupState === "shaking" && (
                <p style={{ color: "#ffe066", fontWeight: "bold", fontSize: "1.1rem", animation: "pulse 1s infinite", marginTop: "1rem" }}>
                  🔊 哗啦哗啦，正在疯狂摇晃...
                </p>
              )}
            </div>

            {/* Message Bar */}
            {sicboMessage && (
              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "6px", textAlign: "center", margin: "1rem 0" }}>
                <p style={{ margin: 0, fontWeight: "bold", color: sicboMessage.includes("赢") ? "#ffe066" : "#ff8787" }}>
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
                  style={{ width: "80px", padding: "4px", background: "#063d20", border: "1px solid #ffe066", color: "#fff", fontWeight: "bold" }}
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
                    backgroundColor: "#ffe066",
                    color: "#121214",
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
          <div style={{ background: "#1e1e24", padding: "1.5rem", borderRadius: "10px", border: "1px solid #2d2d30" }}>
            <h3 style={{ margin: "0 0 1rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚔️ 骰子手牌大对决 (Dice Poker Battle)</span>
              <span style={{ fontSize: "0.85rem", opacity: 0.7, fontWeight: "normal" }}>规则：各自投掷 5 颗骰子，对比成牌组合（如顺子、豹子、一对）大小。</span>
            </h3>

            {/* Arena Board */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "1.5rem" }}>
              {/* Player Side */}
              <div style={{ background: "#121214", borderRadius: "8px", padding: "1rem", textAlign: "center", border: "1.5px solid #4ade80" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#4ade80" }}>👨 你的骰子 (PLAYER)</h4>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", minHeight: "80px", alignItems: "center" }}>
                  {playerDice.length === 0 ? (
                    <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem" }}>等待投掷...</p>
                  ) : (
                    playerDice.map((d, idx) => render3DDice(d, `p_${idx}`))
                  )}
                </div>
                {playerDice.length > 0 && (
                  <p style={{ fontWeight: "bold", color: "#ffe066", marginTop: "0.5rem" }}>
                    手牌牌型：{evaluateDiceHand(playerDice.map(d => d.value)).name}
                  </p>
                )}
              </div>

              {/* AI Side */}
              <div style={{ background: "#121214", borderRadius: "8px", padding: "1rem", textAlign: "center", border: "1.5px solid #ff8787" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#ff8787" }}>🤖 对手 AI 骰子</h4>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", minHeight: "80px", alignItems: "center" }}>
                  {aiDice.length === 0 ? (
                    <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem" }}>等待投掷...</p>
                  ) : (
                    aiDice.map((d, idx) => render3DDice(d, `a_${idx}`))
                  )}
                </div>
                {aiDice.length > 0 && (
                  <p style={{ fontWeight: "bold", color: "#ffe066", marginTop: "0.5rem" }}>
                    手牌牌型：{evaluateDiceHand(aiDice.map(d => d.value)).name}
                  </p>
                )}
              </div>
            </div>

            {/* Results announcement */}
            {battleMessage && (
              <div style={{ background: "rgba(255,224,102,0.05)", border: "1px dashed #ffe066", padding: "0.75rem", borderRadius: "6px", textAlign: "center", marginBottom: "1rem" }}>
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
                  backgroundColor: "#ffe066",
                  color: "#121214",
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
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #2d2d30", borderRadius: "6px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#121214" }}>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid #2d2d30" }}>轮次</th>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid #2d2d30" }}>玩家点数及成牌</th>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid #2d2d30" }}>AI点数及成牌</th>
                        <th style={{ padding: "6px 12px", borderBottom: "1px solid #2d2d30" }}>结果</th>
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
