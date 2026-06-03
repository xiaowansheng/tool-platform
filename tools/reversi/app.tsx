"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// ----------------------------------------------------------------------
// Audio Synthesizer for Reversi Stones
// ----------------------------------------------------------------------
class ReversiAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playStone(volume = 0.15) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High frequency transient clack
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = "sine";
      clickOsc.frequency.setValueAtTime(1200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
      clickGain.gain.setValueAtTime(volume * 0.5, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      // Low resonance body thud
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = "triangle";
      thudOsc.frequency.setValueAtTime(320, now);
      thudOsc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      thudGain.gain.setValueAtTime(volume, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      thudOsc.connect(thudGain);
      thudGain.connect(this.ctx.destination);

      clickOsc.start(now);
      thudOsc.start(now);

      clickOsc.stop(now + 0.03);
      thudOsc.stop(now + 0.1);
    } catch (e) {
      // Audio context error block
    }
  }

  // Play continuous cascade when multiple flips occur
  playFlipsCascade(count: number) {
    if (!this.enabled) return;
    let delay = 0;
    for (let i = 0; i < Math.min(count, 12); i++) {
      setTimeout(() => {
        // Slighter quieter sound for flips
        this.playStone(0.08);
      }, delay);
      delay += 80; // cascade spaced by 80ms
    }
  }

  playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 784.00, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } catch (e) {}
  }

  playGameover() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [392.00, 311.13, 261.63, 196.00];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.08, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
    } catch (e) {}
  }
}

const sfx = new ReversiAudio();

// ----------------------------------------------------------------------
// Reversi Mechanics & Constants
// ----------------------------------------------------------------------
type Cell = 0 | 1 | -1; // 0: Empty, 1: Black, -1: White
type BoardState = Cell[][];
type Mode = "pvp" | "pve";
type AIDifficulty = "easy" | "medium";

// Board positional weights for Minimax AI evaluation
const EVAL_WEIGHTS = [
  [ 120, -20,  20,   5,   5,  20, -20, 120 ],
  [-20,  -40,  -5,  -5,  -5,  -5, -40, -20 ],
  [  20,  -5,  15,   3,   3,  15,  -5,  20 ],
  [   5,  -5,   3,   3,   3,   3,  -5,   5 ],
  [   5,  -5,   3,   3,   3,   3,  -5,   5 ],
  [  20,  -5,  15,   3,   3,  15,  -5,  20 ],
  [-20,  -40,  -5,  -5,  -5,  -5, -40, -20 ],
  [ 120, -20,  20,   5,   5,  20, -20, 120 ]
];

const BOARD_DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Helper to check if row/col is in bounds
const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

// Find which pieces can be flipped by playing at (r, c)
const getFlipsForMove = (board: BoardState, r: number, c: number, player: number): [number, number][] => {
  if (board[r][c] !== 0) return [];
  const flips: [number, number][] = [];
  const opponent = -player;

  for (const [dr, dc] of BOARD_DIRECTIONS) {
    let nr = r + dr;
    let nc = c + dc;
    const tempFlips: [number, number][] = [];

    while (inBounds(nr, nc) && board[nr][nc] === opponent) {
      tempFlips.push([nr, nc]);
      nr += dr;
      nc += dc;
    }

    if (inBounds(nr, nc) && board[nr][nc] === player && tempFlips.length > 0) {
      flips.push(...tempFlips);
    }
  }

  return flips;
};

// Check if a move is valid
const isValidMove = (board: BoardState, r: number, c: number, player: number): boolean => {
  return getFlipsForMove(board, r, c, player).length > 0;
};

// Retrieve list of all valid moves for player
const getValidMoves = (board: BoardState, player: number): [number, number][] => {
  const moves: [number, number][] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isValidMove(board, r, c, player)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
};

// Apply a move to the board (returning a new board state)
const makeMove = (board: BoardState, r: number, c: number, player: number): BoardState => {
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = player as Cell;
  const flips = getFlipsForMove(board, r, c, player);
  flips.forEach(([fr, fc]) => {
    newBoard[fr][fc] = player as Cell;
  });
  return newBoard;
};

// Count black & white stones
const countStones = (board: BoardState) => {
  let black = 0;
  let white = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === 1) black++;
      else if (board[r][c] === -1) white++;
    }
  }
  return { black, white };
};

// Theme Skin configurations
interface BoardTheme {
  id: string;
  name: string;
  gridBg: string;
  cellBg: string;
  cellBorder: string;
  glowColor: string;
  accent: string;
}

const themes: BoardTheme[] = [
  {
    id: "emerald",
    name: "翡翠之光",
    gridBg: "#052e16",
    cellBg: "#064e3b",
    cellBorder: "rgba(16, 185, 129, 0.2)",
    glowColor: "rgba(16, 185, 129, 0.4)",
    accent: "#10b981",
  },
  {
    id: "cyber",
    name: "霓虹极客",
    gridBg: "#0f0826",
    cellBg: "#170f3c",
    cellBorder: "rgba(139, 92, 246, 0.2)",
    glowColor: "rgba(168, 85, 247, 0.4)",
    accent: "#a855f7",
  },
  {
    id: "sunset",
    name: "落日余晖",
    gridBg: "#2d0f02",
    cellBg: "#431407",
    cellBorder: "rgba(249, 115, 22, 0.2)",
    glowColor: "rgba(249, 115, 22, 0.4)",
    accent: "#f97316",
  },
  {
    id: "ocean",
    name: "深海幽谷",
    gridBg: "#021c35",
    cellBg: "#03325c",
    cellBorder: "rgba(56, 189, 248, 0.2)",
    glowColor: "rgba(14, 165, 233, 0.4)",
    accent: "#0ea5e9",
  }
];

// ----------------------------------------------------------------------
// AI Brain
// ----------------------------------------------------------------------
// Positional utility static evaluator
const evaluateBoard = (board: BoardState, player: number): number => {
  let score = 0;
  const opponent = -player;

  // 1. Position weight evaluation
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === player) {
        score += EVAL_WEIGHTS[r][c];
      } else if (board[r][c] === opponent) {
        score -= EVAL_WEIGHTS[r][c];
      }
    }
  }

  // 2. Corner dynamics: adjust adjacent elements weight based on corner control
  const corners = [[0,0], [0,7], [7,0], [7,7]];
  const adjacents = [
    [[0,1], [1,0], [1,1]], // top left
    [[0,6], [1,7], [1,6]], // top right
    [[6,0], [7,1], [6,1]], // bottom left
    [[6,7], [7,6], [6,6]]  // bottom right
  ];

  for (let i = 0; i < 4; i++) {
    const [cr, cc] = corners[i];
    if (board[cr][cc] !== 0) {
      // Corner is taken! Neighbors are no longer dangerous traps, mitigate penalty
      const owner = board[cr][cc];
      for (const [ar, ac] of adjacents[i]) {
        if (board[ar][ac] === owner) {
          score += owner === player ? 30 : -30;
        }
      }
    }
  }

  // 3. Mobility
  const playerMoves = getValidMoves(board, player).length;
  const opponentMoves = getValidMoves(board, opponent).length;
  score += (playerMoves - opponentMoves) * 15;

  return score;
};

// Minimax with alpha-beta pruning
const minimax = (
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: number
): { score: number; move: [number, number] | null } => {
  const opponent = -aiPlayer;
  const validMoves = getValidMoves(board, maximizing ? aiPlayer : opponent);

  // Leaf node or game ended
  if (depth === 0 || validMoves.length === 0) {
    return { score: evaluateBoard(board, aiPlayer), move: null };
  }

  let bestMove: [number, number] | null = null;

  if (maximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of validMoves) {
      const nextBoard = makeMove(board, r, c, aiPlayer);
      const evalResult = minimax(nextBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = [r, c];
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break; // Beta cut-off
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const [r, c] of validMoves) {
      const nextBoard = makeMove(board, r, c, opponent);
      const evalResult = minimax(nextBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = [r, c];
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break; // Alpha cut-off
    }
    return { score: minEval, move: bestMove };
  }
};

// ----------------------------------------------------------------------
// React Component
// ----------------------------------------------------------------------
export default function ReversiTool({ manifest }: ToolAppProps) {
  // Game config states
  const [mode, setMode] = useState<Mode>("pve");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");
  const [aiColor, setAIColor] = useState<number>(-1); // -1: White (player plays black), 1: Black
  const [themeId, setThemeId] = useState<string>("emerald");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Board states
  const [board, setBoard] = useState<BoardState>(() => {
    const initial = Array(8).fill(null).map(() => Array(8).fill(0) as Cell[]);
    // Standard setup
    initial[3][3] = -1;
    initial[3][4] = 1;
    initial[4][3] = 1;
    initial[4][4] = -1;
    return initial;
  });

  const [currentPlayer, setCurrentPlayer] = useState<number>(1); // 1: Black, -1: White
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [hoverMove, setHoverMove] = useState<[number, number] | null>(null);
  const [hoverFlips, setHoverFlips] = useState<[number, number][]>([]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Status triggers
  const [consecutivePasses, setConsecutivePasses] = useState<number>(0);
  const [gameResult, setGameResult] = useState<{
    ended: boolean;
    winner: number; // 1: Black, -1: White, 0: Tie
    reason: string;
  }>({ ended: false, winner: 0, reason: "" });

  const activeTheme = themes.find(t => t.id === themeId) || themes[0];
  const { black: blackCount, white: whiteCount } = countStones(board);

  // Sync sound config
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Recalculate valid moves whenever board or currentPlayer changes
  useEffect(() => {
    if (gameResult.ended) return;

    const moves = getValidMoves(board, currentPlayer);
    setValidMoves(moves);

    // If no valid moves
    if (moves.length === 0) {
      // Check if opponent has moves
      const opponentMoves = getValidMoves(board, -currentPlayer);
      if (opponentMoves.length === 0) {
        // Both players blocked - game over
        endGame(board, "双方无子可落");
      } else {
        // Pass to opponent
        const nextPlayer = -currentPlayer;
        const msg = currentPlayer === 1 ? "黑方 Pass，轮到白方" : "白方 Pass，轮到黑方";
        setConsecutivePasses(prev => prev + 1);

        setTimeout(() => {
          setCurrentPlayer(nextPlayer);
        }, 1200);
      }
    } else {
      setConsecutivePasses(0);
    }
  }, [board, currentPlayer, gameResult.ended]);

  // Handle AI turn
  useEffect(() => {
    if (gameResult.ended || isAiThinking) return;

    const isAITurn = mode === "pve" && currentPlayer === aiColor;
    if (!isAITurn || validMoves.length === 0) return;

    setIsAiThinking(true);

    // Delay a bit for realism
    const aiTimer = setTimeout(() => {
      let r = 0, c = 0;

      if (difficulty === "easy") {
        // Choose move that flips the most (Greedy)
        let maxFlip = -1;
        let best: [number, number] = validMoves[0];
        validMoves.forEach(([vr, vc]) => {
          const count = getFlipsForMove(board, vr, vc, aiColor).length;
          if (count > maxFlip) {
            maxFlip = count;
            best = [vr, vc];
          }
        });
        [r, c] = best;
      } else {
        // Minimax with weights
        const searchResult = minimax(board, 4, -Infinity, Infinity, true, aiColor);
        if (searchResult.move) {
          [r, c] = searchResult.move;
        } else {
          // Fallback
          [r, c] = validMoves[Math.floor(Math.random() * validMoves.length)];
        }
      }

      // Execute AI move
      const flips = getFlipsForMove(board, r, c, aiColor);
      const nextBoard = makeMove(board, r, c, aiColor);

      // Play Sound
      sfx.playStone();
      sfx.playFlipsCascade(flips.length);

      setBoard(nextBoard);
      setCurrentPlayer(-aiColor);
      setIsAiThinking(false);
    }, 800);

    return () => clearTimeout(aiTimer);
  }, [currentPlayer, validMoves, mode, aiColor, difficulty, gameResult.ended]);

  // End Game Calculation
  const endGame = (currentBoard: BoardState, reason: string) => {
    const { black, white } = countStones(currentBoard);
    let winner = 0;
    if (black > white) winner = 1;
    else if (white > black) winner = -1;

    setGameResult({
      ended: true,
      winner,
      reason
    });

    if (mode === "pve") {
      if ((winner === 1 && aiColor === -1) || (winner === -1 && aiColor === 1)) {
        sfx.playVictory();
      } else {
        sfx.playGameover();
      }
    } else {
      sfx.playVictory();
    }
  };

  // Play a move (Human interaction)
  const handleCellClick = (r: number, c: number) => {
    if (gameResult.ended || isAiThinking) return;
    // Block action if it's AI turn in PvE
    if (mode === "pve" && currentPlayer === aiColor) return;

    if (!isValidMove(board, r, c, currentPlayer)) return;

    const flips = getFlipsForMove(board, r, c, currentPlayer);
    const nextBoard = makeMove(board, r, c, currentPlayer);

    sfx.playStone();
    sfx.playFlipsCascade(flips.length);

    setBoard(nextBoard);
    setHoverMove(null);
    setHoverFlips([]);

    // Check if board fully populated
    const { black, white } = countStones(nextBoard);
    if (black + white === 64) {
      endGame(nextBoard, "棋盘已满");
    } else {
      setCurrentPlayer(-currentPlayer);
    }
  };

  // Hover animations/previews
  const handleCellEnter = (r: number, c: number) => {
    if (gameResult.ended || isAiThinking) return;
    if (mode === "pve" && currentPlayer === aiColor) return;

    if (isValidMove(board, r, c, currentPlayer)) {
      setHoverMove([r, c]);
      setHoverFlips(getFlipsForMove(board, r, c, currentPlayer));
    }
  };

  const handleCellLeave = () => {
    setHoverMove(null);
    setHoverFlips([]);
  };

  // Reset Game
  const resetGame = () => {
    const initial = Array(8).fill(null).map(() => Array(8).fill(0) as Cell[]);
    initial[3][3] = -1;
    initial[3][4] = 1;
    initial[4][3] = 1;
    initial[4][4] = -1;

    setBoard(initial);
    setCurrentPlayer(1); // Black starts
    setGameResult({ ended: false, winner: 0, reason: "" });
    setHoverMove(null);
    setHoverFlips([]);
    setIsAiThinking(false);
    setConsecutivePasses(0);
  };

  // Ratio calculations
  const totalStones = blackCount + whiteCount;
  const blackPercent = totalStones > 0 ? (blackCount / totalStones) * 100 : 50;
  const whitePercent = totalStones > 0 ? (whiteCount / totalStones) * 100 : 50;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "920px",
        margin: "0 auto",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #0d0c1b 0%, #050308 100%)",
        borderRadius: "16px",
        border: "1px solid rgba(139, 92, 246, 0.15)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
        color: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      {/* 3D Scene Style Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .stone-3d-wrapper {
          position: relative;
          width: 82%;
          height: 82%;
          perspective: 600px;
        }
        .stone-3d {
          width: 100%;
          height: 100%;
          position: absolute;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border-radius: 50%;
        }
        .stone-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 50%;
          box-shadow: inset -3px -3px 8px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,255,255,0.25), 0 4px 10px rgba(0,0,0,0.4);
        }
        .stone-black {
          background: radial-gradient(circle at 30% 30%, #4b5563 0%, #111827 80%, #030712 100%);
          border: 1px solid #1f2937;
        }
        .stone-white {
          background: radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f4f6 60%, #d1d5db 90%, #9ca3af 100%);
          border: 1px solid #e5e7eb;
        }
        .stone-side-back {
          transform: rotateY(180deg);
        }
      `}} />

      {/* Header controls & Selection Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              margin: 0,
              background: "linear-gradient(to right, #10b981, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Reversi Master
          </h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>
            3D 极简黑白棋 / 奥赛罗
          </p>
        </div>

        {/* Setup Parameters Panel */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {/* Mode switch */}
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              resetGame();
            }}
            style={{
              background: "#121020",
              color: "#fff",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              fontSize: "0.75rem",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="pve">🤖 人机对战</option>
            <option value="pvp">👥 双人对战</option>
          </select>

          {/* Difficulty (Only PVE) */}
          {mode === "pve" && (
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as AIDifficulty)}
              style={{
                background: "#121020",
                color: "#fff",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "6px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="easy">入门人机</option>
              <option value="medium">资深棋手</option>
            </select>
          )}

          {/* Color Switch (Only PVE) */}
          {mode === "pve" && (
            <select
              value={aiColor}
              onChange={(e) => {
                setAIColor(Number(e.target.value));
                resetGame();
              }}
              style={{
                background: "#121020",
                color: "#fff",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "6px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value={-1}>执黑先行 (玩家先)</option>
              <option value={1}>执白后行 (玩家后)</option>
            </select>
          )}
        </div>
      </div>

      {/* Players info board & ratio bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Score blocks */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* Black Player */}
          <div
            style={{
              background: currentPlayer === 1 ? "rgba(255, 255, 255, 0.05)" : "rgba(255,255,255,0.01)",
              border: currentPlayer === 1 ? `1px solid ${activeTheme.accent}` : "1px solid rgba(255,255,255,0.05)",
              padding: "0.75rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.3s"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 30% 30%, #4b5563 0%, #111827 80%)",
                  boxShadow: "0 0 8px rgba(0,0,0,0.5)"
                }}
              />
              <div>
                <div style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                  {mode === "pve" && aiColor === 1 ? "电脑 AI (黑)" : "玩家 1 (黑)"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  {currentPlayer === 1 ? "● 思考中..." : "等待中"}
                </div>
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", fontFamily: "monospace" }}>
              {blackCount}
            </div>
          </div>

          {/* White Player */}
          <div
            style={{
              background: currentPlayer === -1 ? "rgba(255, 255, 255, 0.05)" : "rgba(255,255,255,0.01)",
              border: currentPlayer === -1 ? `1px solid ${activeTheme.accent}` : "1px solid rgba(255,255,255,0.05)",
              padding: "0.75rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.3s"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #d1d5db 80%)",
                  boxShadow: "0 0 8px rgba(255,255,255,0.3)"
                }}
              />
              <div>
                <div style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                  {mode === "pve" && aiColor === -1 ? "电脑 AI (白)" : "玩家 2 (白)"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  {currentPlayer === -1 ? "● 思考中..." : "等待中"}
                </div>
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", fontFamily: "monospace" }}>
              {whiteCount}
            </div>
          </div>
        </div>

        {/* Dynamic percentage comparison slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#9ca3af" }}>
            <span>黑方占领: {blackPercent.toFixed(0)}%</span>
            <span>白方占领: {whitePercent.toFixed(0)}%</span>
          </div>
          <div
            style={{
              height: "10px",
              width: "100%",
              borderRadius: "5px",
              background: "#1f2937",
              overflow: "hidden",
              display: "flex",
              border: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            <div
              style={{
                width: `${blackPercent}%`,
                background: "linear-gradient(to right, #374151, #111827)",
                transition: "width 0.5s ease"
              }}
            />
            <div
              style={{
                width: `${whitePercent}%`,
                background: "linear-gradient(to right, #f3f4f6, #9ca3af)",
                transition: "width 0.5s ease"
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Arena grid container */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          width: "100%",
          padding: "1rem 0"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            aspectRatio: "1/1",
            background: activeTheme.gridBg,
            borderRadius: "12px",
            padding: "8px",
            boxShadow: `0 0 25px ${activeTheme.glowColor}, 0 10px 30px rgba(0,0,0,0.5)`,
            border: `2px solid ${activeTheme.accent}30`,
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gridTemplateRows: "repeat(8, 1fr)",
            gap: "4px",
            position: "relative"
          }}
        >
          {/* Render cells */}
          {board.map((row, rIdx) =>
            row.map((cellValue, cIdx) => {
              const isValid = validMoves.some(([vr, vc]) => vr === rIdx && vc === cIdx);
              const isHovered = hoverMove?.[0] === rIdx && hoverMove?.[1] === cIdx;
              const willBeFlipped = hoverFlips.some(([fr, fc]) => fr === rIdx && fc === cIdx);

              // 3D rotation degrees mapping (Black = 0deg, White = 180deg)
              const rotationY = cellValue === -1 ? 180 : 0;

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onMouseEnter={() => handleCellEnter(rIdx, cIdx)}
                  onMouseLeave={handleCellLeave}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  style={{
                    background: activeTheme.cellBg,
                    border: `1px solid ${activeTheme.cellBorder}`,
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    cursor: isValid ? "pointer" : "default",
                    transition: "background 0.2s"
                  }}
                >
                  {/* Real 3D stone */}
                  {cellValue !== 0 && (
                    <div className="stone-3d-wrapper">
                      <div
                        className="stone-3d"
                        style={{
                          transform: `rotateY(${rotationY}deg)`,
                          // Shaking highlight if it is targeted to be flipped
                          animation: willBeFlipped ? "shake 0.5s infinite" : "none"
                        }}
                      >
                        {/* Front Black */}
                        <div className="stone-face stone-black" />
                        {/* Back White */}
                        <div className="stone-face stone-white stone-side-back" />
                      </div>
                    </div>
                  )}

                  {/* Show preview flip ghost shadow on hover */}
                  {cellValue === 0 && isHovered && (
                    <div
                      style={{
                        width: "80%",
                        height: "80%",
                        borderRadius: "50%",
                        background: currentPlayer === 1 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)",
                        border: `2px dashed ${currentPlayer === 1 ? "#000" : "#fff"}`,
                        transform: "scale(0.9)",
                        animation: "pulse 1.2s infinite",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    />
                  )}

                  {/* Highlighting active changes visually on hover */}
                  {cellValue !== 0 && willBeFlipped && (
                    <div
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        borderRadius: "6px",
                        border: "2px solid rgba(253, 224, 71, 0.8)",
                        boxShadow: "0 0 10px rgba(253, 224, 71, 0.4)",
                        pointerEvents: "none"
                      }}
                    />
                  )}

                  {/* Hint indicator circle for valid empty slots */}
                  {cellValue === 0 && isValid && !isHovered && (
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: `${activeTheme.accent}aa`,
                        boxShadow: `0 0 6px ${activeTheme.accent}`,
                        pointerEvents: "none"
                      }}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* OVERLAYS FOR GAME STATES */}
          {(gameResult.ended || consecutivePasses > 0) && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(10, 8, 20, 0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.5rem",
                borderRadius: "12px",
                backdropFilter: "blur(5px)",
                zIndex: 10
              }}
            >
              {consecutivePasses > 0 && !gameResult.ended && (
                <div style={{ textAlign: "center", padding: "1.5rem" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      border: `4px solid ${activeTheme.accent}`,
                      borderTopColor: "transparent",
                      animation: "spin 1s linear infinite",
                      margin: "0 auto 1rem"
                    }}
                  />
                  <h3 style={{ fontSize: "1.5rem", color: activeTheme.accent, margin: "0" }}>
                    无棋可走，自动跳过...
                  </h3>
                  <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>正在轮空换方手...</p>
                </div>
              )}

              {gameResult.ended && (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <h2
                    style={{
                      fontSize: "2rem",
                      color: gameResult.winner === 0 ? "#9ca3af" : gameResult.winner === 1 ? "#fff" : "#fff",
                      margin: "0 0 0.5rem"
                    }}
                  >
                    {gameResult.winner === 0 ? "握手言和 🤝" : gameResult.winner === 1 ? "黑方大获全胜！🏆" : "白方大获全胜！🏆"}
                  </h2>
                  <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
                    {gameResult.reason} ({blackCount} 比 {whiteCount})
                  </p>
                  <button
                    onClick={resetGame}
                    style={{
                      background: `linear-gradient(to right, ${activeTheme.accent}, #a855f7)`,
                      color: "#fff",
                      border: "none",
                      padding: "0.75rem 2rem",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      borderRadius: "30px",
                      cursor: "pointer",
                      boxShadow: `0 0 15px ${activeTheme.glowColor}`,
                      transition: "transform 0.2s"
                    }}
                  >
                    再来一局
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Control Configuration Tools & Reset Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "rgba(255,255,255,0.02)",
          padding: "1rem",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}
      >
        {/* Active Info / Tips */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isAiThinking ? (
            <span style={{ fontSize: "0.75rem", color: activeTheme.accent, display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="ai-pulse-dot" style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "currentColor", animation: "pulse 1s infinite" }} />
              🤖 AI 正在精密计算棋局中...
            </span>
          ) : (
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              轮到方: <b>{currentPlayer === 1 ? "黑棋 (Black)" : "白棋 (White)"}</b>
            </span>
          )}
        </div>

        {/* Buttons and configs */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Theme Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>皮肤:</span>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              style={{
                background: "#121020",
                color: "#fff",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {themes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: "transparent",
              color: soundEnabled ? "#10b981" : "#ef4444",
              border: "1px solid currentColor",
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            {soundEnabled ? "🔊 音效" : "🔇 静音"}
          </button>

          {/* Restart */}
          <button
            onClick={resetGame}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "0.25rem 0.8rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            🔄 重新开始
          </button>
        </div>
      </div>

      {/* CSS keyframes inline animation injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0% { transform: translate(0, 0) rotateY(var(--rot, 0deg)); }
          20% { transform: translate(-1px, 1px) rotate(0.5deg) rotateY(var(--rot, 0deg)); }
          40% { transform: translate(1px, -1px) rotate(-0.5deg) rotateY(var(--rot, 0deg)); }
          60% { transform: translate(-1px, -1px) rotate(0.5deg) rotateY(var(--rot, 0deg)); }
          80% { transform: translate(1px, 1px) rotate(-0.5deg) rotateY(var(--rot, 0deg)); }
          100% { transform: translate(0, 0) rotateY(var(--rot, 0deg)); }
        }
      `}} />

      {/* How to play instruction */}
      <div style={{ fontSize: "0.8rem", color: "#71717a", lineHeight: "1.4" }}>
        <h4 style={{ margin: "0 0 0.25rem", color: "#9ca3af" }}>黑白棋游戏玩法</h4>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li><b>合法落子</b>：点击棋盘上高亮的发光点落子，该位置必须能在任意直线方向（横、竖、斜）上，与你的其他棋子夹住对手的棋子。</li>
          <li><b>翻转吃子</b>：被夹在中间的所有对手棋子将会旋转翻面，变成你己方的颜色。</li>
          <li><b>智能预览</b>：鼠标悬停在落子点上，会动态闪烁标出此次落子即将翻转的所有对方棋子。</li>
          <li><b>胜负判定</b>：当棋盘填满，或者双方都无棋可走时游戏结束，拥有棋子数最多的一方获得最终胜利。</li>
        </ul>
      </div>
    </div>
  );
}
