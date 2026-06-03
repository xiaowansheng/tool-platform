"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Difficulty = "easy" | "medium" | "hard";

const difficulties: Record<Difficulty, { name: string; rows: number; cols: number }> = {
  easy: { name: "简单 (4x4)", rows: 4, cols: 4 },
  medium: { name: "中等 (6x6)", rows: 6, cols: 6 },
  hard: { name: "困难 (6x8)", rows: 6, cols: 8 }
};

const themes = [
  { id: "fruits", name: "水果乐园", items: ["🍎", "🍌", "🍇", "🍊", "🍓", "🍒", "🍉", "🍍", "🥝", "🍑", "🍈", "🍋", "🥥", "🥑", "🍐", "🥭", "🍏", "🍎", "🫐", "🍒", "🥦", "🌽", "🌶️", "🍄"] },
  { id: "animals", name: "萌宠动物", items: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦁", "🐮", "🐷", "🐒", "🐔", "🐧", "🐦", "🐤", "🦆"] },
  { id: "cyber", name: "赛博霓虹", items: ["🌀", "🌟", "❄️", "⚡", "🌙", "🍀", "🪐", "💎", "🔮", "🧬", "🚀", "🛰️", "🛸", "🛡️", "⚙️", "🔋", "💡", "📡", "🛸", "👾", "🤖", "🎮", "🎸", "🎧"] }
];

const skins = [
  { id: "cyberpunk", name: "暗夜霓虹", bg: "#0d0015", card: "rgba(24, 0, 42, 0.8)", accent: "#00f0ff" },
  { id: "emerald", name: "翡翠之光", bg: "#06140d", card: "rgba(10, 30, 20, 0.8)", accent: "#10b981" },
  { id: "plasma", name: "等离子魔影", bg: "#080612", card: "rgba(15, 10, 30, 0.8)", accent: "#a855f7" },
  { id: "solar", name: "熔岩余晖", bg: "#1a0f0a", card: "rgba(40, 20, 10, 0.8)", accent: "#f97316" }
];

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatchTool({ manifest }: ToolAppProps) {
  // Theme Skin State
  const [skin, setSkin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("memory_theme_skin") || "cyberpunk";
    }
    return "cyberpunk";
  });
  const activeSkin = skins.find((s) => s.id === skin) || skins[0];

  // Game Settings States
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [themeId, setThemeId] = useState<string>("fruits");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Core Game States
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]); // index of cards selected
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timer, setTimer] = useState(0);
  const [bestMoves, setBestMoves] = useState<Record<Difficulty, number>>({
    easy: 0,
    medium: 0,
    hard: 0
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Locks to prevent double clicking during card evaluations
  const lockBoardRef = useRef(false);

  // Timer interval ref
  const timerIntervalRef = useRef<any>(null);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Combo timestamp tracker
  const lastMatchTimeRef = useRef<number>(0);

  // Load High Scores on mount
  useEffect(() => {
    const savedScores = localStorage.getItem("memory_best_moves");
    if (savedScores) {
      try {
        setBestMoves(JSON.parse(savedScores));
      } catch (e) {}
    }
  }, []);

  // Timer updater
  useEffect(() => {
    if (gameStarted && !gameWon) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [gameStarted, gameWon]);

  // Audio Synthesis helpers
  const playSound = (freqs: number[], durations: number[], type: OscillatorType = "sine") => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      let time = ctx.currentTime;

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        const dur = durations[index] || 0.1;
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
        time += dur * 0.8;
      });
    } catch (e) {}
  };

  const playFlipSound = () => {
    playSound([260], [0.05], "sine");
  };

  const playMatchSound = (currentCombo: number) => {
    // Pitch shift upwards based on combo count (combo chime scales)
    const baseFreq = 523.25; // C5
    // Ascending major scale frequencies for combos: C, D, E, F, G, A, B, C...
    const scale = [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875, 2.0];
    const multiplier = scale[Math.min(currentCombo, scale.length - 1)];
    
    playSound([baseFreq * multiplier, baseFreq * multiplier * 1.25], [0.08, 0.15], "sine");
  };

  const playMismatchSound = () => {
    playSound([200, 150], [0.08, 0.15], "triangle");
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 to E6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.05, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (e) {}
  };

  const playTickSound = () => {
    playSound([600], [0.05], "sine");
  };

  // Generate shuffled card set
  const initGame = (diff: Difficulty, thId: string) => {
    const config = difficulties[diff];
    const totalPairs = (config.rows * config.cols) / 2;

    const theme = themes.find((t) => t.id === thId) || themes[0];
    // Slice items up to required pairs and duplicate
    const activeItems = theme.items.slice(0, totalPairs);
    const duplicatedItems = [...activeItems, ...activeItems];

    // Shuffle
    const shuffled = duplicatedItems
      .map((item, idx) => ({ id: idx, value: item, isFlipped: false, isMatched: false }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setSelectedCards([]);
    setMoves(0);
    setMatches(0);
    setCombo(0);
    setTimer(0);
    setGameWon(false);
    setGameStarted(true);
    lockBoardRef.current = false;
    lastMatchTimeRef.current = 0;
    playTickSound();
  };

  // Card click trigger
  const handleCardClick = (index: number) => {
    if (lockBoardRef.current || cards[index].isFlipped || cards[index].isMatched || !gameStarted || gameWon) return;

    playFlipSound();

    // Flip card
    const nextCards = cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c));
    setCards(nextCards);

    const nextSelected = [...selectedCards, index];
    setSelectedCards(nextSelected);

    // If 2 cards selected, evaluate match
    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      evaluateMatch(nextSelected, nextCards);
    }
  };

  // Check matching cards
  const evaluateMatch = (selected: number[], currentCards: Card[]) => {
    lockBoardRef.current = true;

    const [firstIdx, secondIdx] = selected;
    const isMatch = currentCards[firstIdx].value === currentCards[secondIdx].value;

    if (isMatch) {
      // Evaluate Combo: match within 3.5 seconds updates combo meter
      const now = Date.now();
      let nextCombo = 0;
      if (lastMatchTimeRef.current > 0 && now - lastMatchTimeRef.current < 3500) {
        nextCombo = combo + 1;
      } else {
        nextCombo = 1;
      }
      lastMatchTimeRef.current = now;
      setCombo(nextCombo);
      playMatchSound(nextCombo);

      // Lock matched status
      const updatedCards = currentCards.map((c, i) =>
        i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c
      );

      setCards(updatedCards);
      setMatches((m) => {
        const nextMatches = m + 1;
        const totalPairs = (difficulties[difficulty].rows * difficulties[difficulty].cols) / 2;
        if (nextMatches === totalPairs) {
          handleWin();
        }
        return nextMatches;
      });

      setSelectedCards([]);
      lockBoardRef.current = false;
    } else {
      // Mismatch
      playMismatchSound();
      setCombo(0); // reset combo

      // Flip back after delay
      setTimeout(() => {
        const resetCards = currentCards.map((c, i) =>
          i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
        );
        setCards(resetCards);
        setSelectedCards([]);
        lockBoardRef.current = false;
      }, 900);
    }
  };

  const handleWin = () => {
    setGameWon(true);
    playWinSound();

    // Check best score (moves)
    const currentBest = bestMoves[difficulty];
    const finalMoves = moves + 1; // since state moves hasn't updated in evaluation frame yet
    if (currentBest === 0 || finalMoves < currentBest) {
      const nextBests = { ...bestMoves, [difficulty]: finalMoves };
      setBestMoves(nextBests);
      localStorage.setItem("memory_best_moves", JSON.stringify(nextBests));
    }
  };

  // Accuracy calculation
  const getAccuracy = () => {
    if (moves === 0) return 0;
    return Math.round((matches / moves) * 100);
  };

  // Format Timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Auto trigger default game on start
  useEffect(() => {
    initGame(difficulty, themeId);
  }, [difficulty, themeId]);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#ffffff",
        background: activeSkin.bg,
        padding: "2rem 1.5rem",
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .card-perspective {
          perspective: 600px;
          aspect-ratio: 3/4;
          cursor: pointer;
          user-select: none;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15);
          transform-style: preserve-3d;
        }
        .card-perspective:hover .card-inner {
          box-shadow: 0 0 10px ${activeSkin.accent}66;
        }
        .card-flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        }
        .card-front {
          background: ${activeSkin.card};
          border: 1.5px solid ${activeSkin.accent}66;
          color: ${activeSkin.accent};
          transform: rotateY(180deg);
        }
        .card-back {
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.15);
        }
        .card-matched {
          border-color: #22c55e !important;
          opacity: 0.6;
        }
        .btn-skin-selector {
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 4px;
          border: 1px solid ${activeSkin.accent}44;
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-skin-selector.active {
          background: ${activeSkin.accent};
          color: ${activeSkin.bg};
          border-color: ${activeSkin.accent};
          font-weight: bold;
        }
      `}} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "560px" }}>
        {/* Header Title */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: activeSkin.accent, margin: 0, textShadow: `0 0 10px ${activeSkin.accent}88` }}>
              记忆翻盘
            </h2>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0.25rem 0 0 0" }}>
              轻量 3D 卡片配对脑力锻炼
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {skins.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSkin(s.id);
                  localStorage.setItem("memory_theme_skin", s.id);
                  playTickSound();
                }}
                className={`btn-skin-selector ${skin === s.id ? "active" : ""}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Panels */}
        <div
          style={{
            background: activeSkin.card,
            border: `1px solid ${activeSkin.accent}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.2rem"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>难度级别</span>
            <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px" }}>
              {(Object.keys(difficulties) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    border: "none",
                    background: difficulty === d ? activeSkin.accent : "transparent",
                    color: difficulty === d ? activeSkin.bg : "#ffffff",
                    fontWeight: difficulty === d ? "bold" : "normal",
                    cursor: "pointer"
                  }}
                >
                  {difficulties[d].name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>卡片主题</span>
            <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px" }}>
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => {
                    setThemeId(th.id);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    border: "none",
                    background: themeId === th.id ? activeSkin.accent : "transparent",
                    color: themeId === th.id ? activeSkin.bg : "#ffffff",
                    fontWeight: themeId === th.id ? "bold" : "normal",
                    cursor: "pointer"
                  }}
                >
                  {th.name.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div
          style={{
            background: activeSkin.card,
            border: `1px solid ${activeSkin.accent}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.5rem",
            textAlign: "center"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>翻牌次数</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ffffff" }}>
              {moves}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>准确率</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: activeSkin.accent }}>
              {getAccuracy()}%
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>连消 Combos</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: combo > 1 ? "#ff007f" : "#888888" }}>
              {combo > 1 ? `x${combo}` : "-"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>用时 / 记录</span>
            <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#a3e635" }}>
              {formatTime(timer)} <span style={{ fontSize: "0.75rem", opacity: 0.5, fontWeight: "normal" }}>/ {bestMoves[difficulty] || "--"}步</span>
            </span>
          </div>
        </div>

        {/* Memory Grid board */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${difficulties[difficulty].cols}, 1fr)`,
              gap: "0.75rem",
              background: "rgba(10, 5, 20, 0.4)",
              border: `2px solid ${activeSkin.accent}22`,
              borderRadius: "10px",
              padding: "1rem"
            }}
          >
            {cards.map((card, index) => {
              const flippedClass = card.isFlipped || card.isMatched ? "card-flipped" : "";
              const matchedClass = card.isMatched ? "card-matched" : "";

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(index)}
                  className="card-perspective"
                >
                  <div className={`card-inner ${flippedClass}`}>
                    {/* Back cover */}
                    <div className="card-face card-back" style={{ fontSize: "1.5rem" }}>
                      ❓
                    </div>
                    {/* Front revealed value */}
                    <div className={`card-face card-front ${matchedClass}`} style={{ fontSize: "2rem" }}>
                      {card.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Win Overlay */}
          {gameWon && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(10, 5, 20, 0.9)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                textAlign: "center",
                zIndex: 10
              }}
            >
              <h3 style={{ fontSize: "2.2rem", color: activeSkin.accent, fontWeight: "900", textShadow: `0 0 10px ${activeSkin.accent}` }}>
                🎉 挑战成功 🎉
              </h3>
              <p style={{ opacity: 0.8, fontSize: "0.95rem" }}>
                用时 <strong style={{ color: "#a3e635" }}>{formatTime(timer)}</strong>，翻牌 <strong style={{ color: activeSkin.accent }}>{moves}</strong> 次即可完成！
              </p>
              <button
                type="button"
                onClick={() => initGame(difficulty, themeId)}
                style={{
                  padding: "0.6rem 2rem",
                  background: activeSkin.accent,
                  color: activeSkin.bg,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  borderRadius: "24px",
                  border: "none",
                  boxShadow: `0 0 15px ${activeSkin.accent}`,
                  cursor: "pointer"
                }}
              >
                重新开始
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div
          style={{
            background: activeSkin.card,
            border: `1px solid ${activeSkin.accent}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button
              onClick={() => initGame(difficulty, themeId)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: `1px solid ${activeSkin.accent}`,
                background: "transparent",
                color: activeSkin.accent,
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: "bold",
                gridColumn: "span 2"
              }}
            >
              洗牌重置棋盘 (Shuffle)
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", opacity: 0.75, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  setSoundEnabled(e.target.checked);
                  playTickSound();
                }}
                style={{ cursor: "pointer" }}
              />
              启用翻牌和消消乐音效
            </label>

            <span>连续连消卡片能产生<strong>和弦连击音效</strong>！</span>
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: "1rem",
            background: `${activeSkin.accent}11`,
            border: `1px dashed ${activeSkin.accent}44`,
            borderRadius: "6px",
            fontSize: "0.85rem",
            lineHeight: "1.4"
          }}
        >
          🎮 <strong>玩法与得分技巧：</strong>
          <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.2rem" }}>
            <li>点击任意暗牌卡片翻开它，记住其上面的图案与位置。</li>
            <li>随后点击翻开第二张卡片。若两张牌相同则配对成功并消除；不同则会翻转盖回。</li>
            <li>在 3.5 秒内连续实现消除配对，会激活 <strong>Combos 连消连击</strong>，能发出悦耳的上升和弦音效，是挑战记忆力手速的关键！</li>
            <li>挑战极简步数通关（Best Moves 记录在底部展示），难度越大，卡片越多，越考验瞬时记忆能力。</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
