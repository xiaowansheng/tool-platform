"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Player = "black" | "white";
type CellState = "" | Player;
type GameMode = "pve" | "pvp";

const BOARD_SIZE = 15;

const themes = [
  { id: "wooden", name: "经典木纹", boardBg: "#eab308", accent: "#854d0e", bg: "#1e1b18", card: "rgba(42, 34, 27, 0.85)" },
  { id: "cyberpunk", name: "赛博霓虹", boardBg: "#0d0015", accent: "#00f0ff", bg: "#030008", card: "rgba(18, 0, 30, 0.85)" }
];

// Initialize empty grid
const createEmptyBoard = (): CellState[][] =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(""));

// Gobang star points (15x15 coordinates, 0-indexed)
const STAR_POINTS = [
  { r: 3, c: 3 }, { r: 3, c: 11 },
  { r: 7, c: 7 },
  { r: 11, c: 3 }, { r: 11, c: 11 }
];

export default function GobangTool({ manifest }: ToolAppProps) {
  // Theme State
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gobang_theme_skin") || "wooden";
    }
    return "wooden";
  });
  const activeTheme = themes.find((t) => t.id === theme) || themes[0];

  // Game Settings States
  const [gameMode, setGameMode] = useState<GameMode>("pve");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<"medium" | "hard">("hard");

  // Core Game Board States
  const [board, setBoard] = useState<CellState[][]>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>("black");
  const [winner, setWinner] = useState<CellState>("");
  const [winningLine, setWinningLine] = useState<{ r: number; c: number }[]>([]);
  const [lastMove, setLastMove] = useState<{ r: number; c: number } | null>(null);

  // Undo move stack
  const [history, setHistory] = useState<{ board: CellState[][]; currentPlayer: Player; lastMove: { r: number; c: number } | null }[]>([]);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Trigger AI move if PVE and white's turn
  useEffect(() => {
    if (gameMode === "pve" && currentPlayer === "white" && !winner) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner]);

  // Audio synthesis helper for wooden stone click
  const playStoneSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      // Wooden block clack: pitch attack + low pass noise burst
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch sweep
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      // Amplitude Envelope
      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);

      osc.connect(oscGain);
      oscGain.connect(filter);
      filter.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);

      // Noise burst for thud/friction
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();

      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch (e) {}
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.05, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } catch (e) {}
  };

  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  };

  // Check lines of 5 stones
  const checkWin = (grid: CellState[][], r: number, c: number, player: Player) => {
    const directions = [
      { dr: 0, dc: 1 },  // horizontal
      { dr: 1, dc: 0 },  // vertical
      { dr: 1, dc: 1 },  // diagonal down-right
      { dr: 1, dc: -1 }  // diagonal down-left
    ];

    for (const { dr, dc } of directions) {
      let count = 1;
      const line = [{ r, c }];

      // Positive offset direction
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
          count++;
          line.push({ r: nr, c: nc });
          step++;
        } else {
          break;
        }
      }

      // Negative offset direction
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
          count++;
          line.push({ r: nr, c: nc });
          step++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return line;
      }
    }

    return null;
  };

  // Place stone action
  const handlePlaceStone = (r: number, c: number) => {
    if (board[r][c] !== "" || winner) return;
    
    // Guard: block human from placing stone when AI is processing in PVE mode
    if (gameMode === "pve" && currentPlayer === "white") return;

    placeStoneOnGrid(r, c, currentPlayer);
  };

  const placeStoneOnGrid = (r: number, c: number, player: Player) => {
    // Record history
    const prevBoard = board.map((row) => [...row]);
    setHistory((prev) => [...prev, { board: prevBoard, currentPlayer, lastMove }]);

    // Update board
    const nextBoard = board.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === r && cIdx === c ? player : cell))
    );

    setBoard(nextBoard);
    setLastMove({ r, c });
    playStoneSound();

    // Check winner
    const winLine = checkWin(nextBoard, r, c, player);
    if (winLine) {
      setWinner(player);
      setWinningLine(winLine);
      playWinSound();
      return;
    }

    // Switch turn
    setCurrentPlayer(player === "black" ? "white" : "black");
  };

  // Undo action
  const handleUndo = () => {
    if (history.length === 0) return;
    playTickSound();

    // If PVE, we want to undo BOTH player and AI move (last 2 entries) unless AI hasn't moved yet
    if (gameMode === "pve" && history.length >= 2) {
      const targetState = history[history.length - 2];
      setBoard(targetState.board);
      setCurrentPlayer(targetState.currentPlayer);
      setLastMove(targetState.lastMove);
      setHistory((prev) => prev.slice(0, -2));
    } else {
      // PVP just undo 1 move
      const targetState = history[history.length - 1];
      setBoard(targetState.board);
      setCurrentPlayer(targetState.currentPlayer);
      setLastMove(targetState.lastMove);
      setHistory((prev) => prev.slice(0, -1));
    }

    setWinner("");
    setWinningLine([]);
  };

  // Reset Game
  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer("black");
    setWinner("");
    setWinningLine([]);
    setLastMove(null);
    setHistory([]);
    playTickSound();
  };

  // Heuristic AI Opponent Logic
  const makeAiMove = () => {
    // Evaluate all empty positions and find the highest score
    let bestScore = -1;
    let bestPositions: { r: number; c: number }[] = [];

    // Calculate score evaluation grid
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === "") {
          const score = evaluatePosition(board, r, c);
          if (score > bestScore) {
            bestScore = score;
            bestPositions = [{ r, c }];
          } else if (score === bestScore) {
            bestPositions.push({ r, c });
          }
        }
      }
    }

    // If no moves possible (full board)
    if (bestPositions.length === 0) return;

    // Pick one at random from the best positions to make AI play slightly less predictable
    const choice = bestPositions[Math.floor(Math.random() * bestPositions.length)];
    placeStoneOnGrid(choice.r, choice.c, "white");
  };

  // Heuristic Position Evaluator
  const evaluatePosition = (grid: CellState[][], r: number, c: number): number => {
    let totalScore = 0;

    const directions = [
      { dr: 0, dc: 1 },  // horizontal
      { dr: 1, dc: 0 },  // vertical
      { dr: 1, dc: 1 },  // diagonal down-right
      { dr: 1, dc: -1 }  // diagonal down-left
    ];

    // Simple tuple counting
    for (const { dr, dc } of directions) {
      totalScore += evaluateDirection(grid, r, c, dr, dc, "white", "black"); // Attack score
      totalScore += evaluateDirection(grid, r, c, dr, dc, "black", "white") * 0.95; // Defense score (block human)
    }

    // Prefer center tiles slightly to play more active openings
    const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
    totalScore += (15 - centerDist) * 1.5;

    return totalScore;
  };

  // Evaluate scores in one direction
  const evaluateDirection = (
    grid: CellState[][],
    r: number,
    c: number,
    dr: number,
    dc: number,
    mine: Player,
    enemy: Player
  ): number => {
    // Look at a window of 5 consecutive coordinates containing our position
    // There are 5 such windows in Gobang
    let directionScore = 0;

    for (let offset = -4; offset <= 0; offset++) {
      let mineCount = 0;
      let enemyCount = 0;
      let outOfBounds = false;

      // Analyze 5 cells
      for (let i = 0; i < 5; i++) {
        const step = offset + i;
        const nr = r + dr * step;
        const nc = c + dc * step;

        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
          outOfBounds = true;
          break;
        }

        const cell = grid[nr][nc];
        if (cell === mine) mineCount++;
        else if (cell === enemy) enemyCount++;
      }

      if (outOfBounds) continue;

      // Weight windows based on pieces counts
      if (enemyCount === 0) {
        if (mineCount === 4) {
          directionScore += 50000; // immediate 5-in-a-row potential
        } else if (mineCount === 3) {
          directionScore += 3500;  // open 4 potential
        } else if (mineCount === 2) {
          directionScore += 450;
        } else if (mineCount === 1) {
          directionScore += 40;
        } else {
          directionScore += 4;
        }
      } else if (mineCount === 0) {
        // Defensive weighting (block enemy)
        if (enemyCount === 4) {
          directionScore += 18000; // emergency block
        } else if (enemyCount === 3) {
          directionScore += 2200;
        } else if (enemyCount === 2) {
          directionScore += 150;
        } else if (enemyCount === 1) {
          directionScore += 10;
        }
      }
    }

    return directionScore;
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#ffffff",
        background: activeTheme.bg,
        padding: "2rem 1.5rem",
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes stonePulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .gobang-cell {
          position: relative;
          aspect-ratio: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gobang-cell-cross-h, .gobang-cell-cross-v {
          position: absolute;
          background: ${theme === "wooden" ? "rgba(0, 0, 0, 0.25)" : "rgba(0, 240, 255, 0.25)"};
          z-index: 1;
        }
        .gobang-cell-cross-h {
          left: 0; right: 0;
          height: 1.5px;
          top: 50%; transform: translateY(-50%);
        }
        .gobang-cell-cross-v {
          top: 0; bottom: 0;
          width: 1.5px;
          left: 50%; transform: translateX(-50%);
        }
        .gobang-star-point {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${theme === "wooden" ? "#3b2314" : "#00f0ff"};
          z-index: 2;
          box-shadow: ${theme === "cyberpunk" ? "0 0 6px #00f0ff" : "none"};
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
        }
        .stone {
          position: relative;
          width: 82%;
          height: 82%;
          border-radius: 50%;
          z-index: 3;
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .stone-black {
          background: radial-gradient(circle at 30% 30%, #444444, #121212 70%);
        }
        .stone-white {
          background: radial-gradient(circle at 30% 30%, #ffffff, #dedede 60%, #b8b8b8 90%);
          border: 1px solid rgba(0,0,0,0.1);
        }
        .stone-last-pulse {
          animation: stonePulse 1.8s infinite;
        }
        .stone-winning-glow {
          box-shadow: 0 0 16px 4px #22c55e !important;
          border: 2px solid #22c55e !important;
        }
        .btn-skin-selector {
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 4px;
          border: 1px solid ${activeTheme.accent}44;
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-skin-selector.active {
          background: ${activeTheme.accent};
          color: ${theme === "wooden" ? "#ffffff" : "#000000"};
          border-color: ${activeTheme.accent};
          font-weight: bold;
        }
      `}} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "480px" }}>
        {/* Header Title */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: activeTheme.accent, margin: 0, textShadow: theme === "cyberpunk" ? `0 0 10px ${activeTheme.accent}88` : "none" }}>
              五子棋大师
            </h2>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0.25rem 0 0 0" }}>
              轻量人机对弈与同屏对决
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  localStorage.setItem("gobang_theme_skin", t.id);
                  playTickSound();
                }}
                className={`btn-skin-selector ${theme === t.id ? "active" : ""}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard / Turn Indicators */}
        <div
          style={{
            background: activeTheme.card,
            border: `1px solid ${activeTheme.accent}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>模式类型</span>
            <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px" }}>
              <button
                onClick={() => {
                  setGameMode("pve");
                  resetGame();
                }}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  border: "none",
                  borderRadius: "4px",
                  background: gameMode === "pve" ? activeTheme.accent : "transparent",
                  color: gameMode === "pve" ? (theme === "wooden" ? "#ffffff" : "#000") : "#fff",
                  fontWeight: gameMode === "pve" ? "bold" : "normal",
                  cursor: "pointer"
                }}
              >
                人机对战 (PVE)
              </button>
              <button
                onClick={() => {
                  setGameMode("pvp");
                  resetGame();
                }}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  border: "none",
                  borderRadius: "4px",
                  background: gameMode === "pvp" ? activeTheme.accent : "transparent",
                  color: gameMode === "pvp" ? (theme === "wooden" ? "#ffffff" : "#000") : "#fff",
                  fontWeight: gameMode === "pvp" ? "bold" : "normal",
                  cursor: "pointer"
                }}
              >
                双人对决 (PVP)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>当前回合</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: currentPlayer === "black" ? "#000000" : "#ffffff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: currentPlayer === "white" ? "0 0 8px rgba(255,255,255,0.4)" : "none"
                }}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: activeTheme.accent }}>
                {winner ? (winner === "black" ? "黑棋胜利" : "白棋胜利") : (currentPlayer === "black" ? "黑子行动" : "白子行动")}
              </span>
            </div>
          </div>
        </div>

        {/* Board table container */}
        <div
          style={{
            width: "100%",
            aspectRatio: "1/1",
            backgroundColor: activeTheme.boardBg,
            borderRadius: "8px",
            border: theme === "wooden" ? "10px solid #854d0e" : `4px solid ${activeTheme.accent}`,
            boxShadow: theme === "cyberpunk" ? `0 0 15px ${activeTheme.accent}55` : "0 8px 24px rgba(0,0,0,0.5)",
            padding: "8px",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isStarPoint = STAR_POINTS.some((p) => p.r === r && p.c === c);
              const isLast = lastMove && lastMove.r === r && lastMove.c === c;
              
              const isWinningCell = winningLine.some((p) => p.r === r && p.c === c);

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handlePlaceStone(r, c)}
                  className="gobang-cell"
                >
                  {/* Grid Lines intersect cross */}
                  <div className="gobang-cell-cross-h" />
                  <div className="gobang-cell-cross-v" />

                  {/* Star point reference dots */}
                  {isStarPoint && <div className="gobang-star-point" />}

                  {/* Placed stone */}
                  {cell !== "" && (
                    <div
                      className={`stone stone-${cell} ${isLast && !winner ? "stone-last-pulse" : ""} ${isWinningCell ? "stone-winning-glow" : ""}`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action button controls */}
        <div
          style={{
            background: activeTheme.card,
            border: `1px solid ${activeTheme.accent}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button
              onClick={handleUndo}
              disabled={history.length === 0 || !!winner}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: `1px solid ${activeTheme.accent}44`,
                background: "rgba(255, 255, 255, 0.03)",
                color: "#ffffff",
                fontSize: "0.85rem",
                cursor: (history.length === 0 || !!winner) ? "not-allowed" : "pointer",
                opacity: (history.length === 0 || !!winner) ? 0.4 : 1,
                fontWeight: "bold"
              }}
            >
              悔棋 (Undo)
            </button>
            <button
              onClick={resetGame}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: `1px solid ${activeTheme.accent}`,
                background: "transparent",
                color: activeTheme.accent,
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              重新开始 (Reset)
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
              启用落子木板音效
            </label>

            {gameMode === "pve" && (
              <span style={{ fontSize: "0.75rem" }}>
                AI级别: <strong style={{ color: activeTheme.accent }}>启发式智能算法</strong>
              </span>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: "1rem",
            background: `${activeTheme.accent}11`,
            border: `1px dashed ${activeTheme.accent}44`,
            borderRadius: "6px",
            fontSize: "0.85rem",
            lineHeight: "1.4"
          }}
        >
          🎮 <strong>对弈规则与技巧：</strong>
          <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.2rem" }}>
            <li>双方轮流在棋盘的十字交叉点上落子，黑子先行。</li>
            <li>最先在横线、竖线或斜对角线方向上连成 <strong>五子（或以上）</strong> 的一方获胜。</li>
            <li>棋盘中间和周边的五个小黑圆点是<strong>星位参考点</strong>，正中央为<strong>天元</strong>。</li>
            <li><strong>AI 启发式算法</strong>：人机对战模式下，AI 会在每次落子时全局搜索能够连成 5 子或者堵截你 3、4 子的最佳空点，极具挑战！</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
