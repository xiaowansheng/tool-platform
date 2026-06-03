"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  exploded: boolean; // clicked mine
}

type Difficulty = "easy" | "medium" | "hard" | "custom";

const difficultySettings: Record<Exclude<Difficulty, "custom">, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
};

const themes = [
  { id: "classic", name: "经典", primary: "#ffe066", secondary: "#ff9f43" },
  { id: "cyberpunk", name: "赛博霓虹", primary: "#00f0ff", secondary: "#ff007f" },
  { id: "retro", name: "复古像素", primary: "#ff6b6b", secondary: "#4ecdc4" },
  { id: "forest", name: "绿野仙踪", primary: "#a3e635", secondary: "#10b981" },
  { id: "sunset", name: "落日金辉", primary: "#f97316", secondary: "#facc15" },
  { id: "cosmic", name: "极光魅影", primary: "#a855f7", secondary: "#ec4899" }
];

const getNumberColor = (num: number, currentTheme: string) => {
  const numberColorsByTheme: Record<string, string[]> = {
    classic: [
      "",
      "#3b82f6", // 1 - Blue
      "#10b981", // 2 - Green
      "#ef4444", // 3 - Red
      "#8b5cf6", // 4 - Purple
      "#f59e0b", // 5 - Yellow/Orange
      "#06b6d4", // 6 - Cyan
      "#14b8a6", // 7 - Teal
      "#6b7280"  // 8 - Grey
    ],
    cyberpunk: [
      "",
      "#00f0ff", // 1 - Cyan
      "#ff007f", // 2 - Hot Pink
      "#39ff14", // 3 - Neon Green
      "#fffb00", // 4 - Neon Yellow
      "#9d00ff", // 5 - Neon Purple
      "#ff5500", // 6 - Neon Orange
      "#00ffcc", // 7 - Neon Teal
      "#888888"  // 8 - Grey
    ],
    retro: [
      "",
      "#0000ff", // 1 - Blue
      "#008000", // 2 - Green
      "#ff0000", // 3 - Red
      "#000080", // 4 - Dark Blue
      "#800000", // 5 - Dark Red
      "#008080", // 6 - Teal
      "#000000", // 7 - Black
      "#808080"  // 8 - Grey
    ],
    forest: [
      "",
      "#a3e635", // 1 - Lime
      "#10b981", // 2 - Emerald
      "#f59e0b", // 3 - Amber
      "#2d5a27", // 4 - Dark Forest Green
      "#bc6c25", // 5 - Brown
      "#dda15e", // 6 - Sand
      "#588157", // 7 - Sage
      "#1e392a"  // 8 - Dark Green
    ],
    sunset: [
      "",
      "#f97316", // 1 - Orange
      "#facc15", // 2 - Yellow
      "#ef4444", // 3 - Red
      "#d62828", // 4 - Dark Red
      "#f77f00", // 5 - Tangerine
      "#ec4899", // 6 - Pink
      "#eae2b7", // 7 - Cream
      "#4b2a22"  // 8 - Dark Sunset
    ],
    cosmic: [
      "",
      "#a855f7", // 1 - Purple
      "#ec4899", // 2 - Pink
      "#3b82f6", // 3 - Blue
      "#ffd670", // 4 - Yellow
      "#e9ff70", // 5 - Lime
      "#c084fc", // 6 - Light Purple
      "#00e8e8", // 7 - Cyan
      "#7b2cbf"  // 8 - Deep Violet
    ]
  };

  const themeList = numberColorsByTheme[currentTheme] || numberColorsByTheme.classic;
  return themeList[num] || "";
};

export default function MinesweeperTool({ manifest }: ToolAppProps) {
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

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [minesCount, setMinesCount] = useState(10);
  const [flagsCount, setFlagsCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Custom size states
  const [customRows, setCustomRows] = useState(10);
  const [customCols, setCustomCols] = useState(10);
  const [customMines, setCustomMines] = useState(15);

  // Layout limits
  const activeParams = difficulty === "custom" 
    ? { rows: customRows, cols: customCols, mines: customMines }
    : difficultySettings[difficulty];

  // Ref trackers
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize board
  useEffect(() => {
    initBoard();
    return () => stopTimer();
  }, [difficulty, customRows, customCols, customMines]);

  // Handle timer ticks
  useEffect(() => {
    if (gameStatus === "playing") {
      startTimer();
    } else {
      stopTimer();
    }
  }, [gameStatus]);

  const startTimer = () => {
    stopTimer();
    setTimer(0);
    timerIntervalRef.current = window.setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Audio Synthesizers
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {}
  };

  const playFlagSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  };

  const playCascadeRevealSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      // Staggered high pops representing space opening
      const now = ctx.currentTime;
      [0, 0.05, 0.1].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(750 + idx * 80, now + delay);
        gain.gain.setValueAtTime(0.015, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.04);
      });
    } catch (e) {}
  };

  const playExplosionSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      // Lowpass filtered noise sweep representing explosion boom
      const duration = 1.3;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(700, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(8, ctx.currentTime + duration - 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      source.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const playVictorySound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      // Happy major arpeggio sweep
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.06, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } catch (e) {}
  };

  // Build grid data
  const initBoard = () => {
    const { rows, cols, mines } = activeParams;
    const initialGrid: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
          exploded: false
        });
      }
      initialGrid.push(row);
    }

    setGrid(initialGrid);
    setGameStatus("idle");
    setMinesCount(mines);
    setFlagsCount(0);
    setTimer(0);
    stopTimer();
  };

  // Deploy mines: first clicked cell and its 8 neighbors are guaranteed clean
  const generateMines = (firstRow: number, firstCol: number, targetGrid: Cell[][]) => {
    const { rows, cols, mines } = activeParams;
    let placedMines = 0;

    while (placedMines < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);

      // Check if coordinates represent the clicked cell or its immediate neighbors
      const isNeighborOfFirstClick = Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1;

      if (!targetGrid[r][c].isMine && !isNeighborOfFirstClick) {
        targetGrid[r][c].isMine = true;
        placedMines++;
      }
    }

    // Compute neighbor mines counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!targetGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && targetGrid[nr][nc].isMine) {
                count++;
              }
            }
          }
          targetGrid[r][c].neighborMines = count;
        }
      }
    }
  };

  // Perform flood fill reveal recursively
  const revealCellRecursive = (r: number, c: number, targetGrid: Cell[][], revealsSet: Set<string>) => {
    const { rows, cols } = activeParams;
    const key = `${r}-${c}`;
    if (revealsSet.has(key)) return;

    const cell = targetGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    revealsSet.add(key);

    if (cell.neighborMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            revealCellRecursive(nr, nc, targetGrid, revealsSet);
          }
        }
      }
    }
  };

  // Reveal Cell Action
  const handleReveal = (r: number, c: number) => {
    if (gameStatus === "lost" || gameStatus === "won") return;

    let currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    let status = gameStatus;

    if (status === "idle") {
      // Guaranteed clean first click
      generateMines(r, c, currentGrid);
      status = "playing";
      setGameStatus("playing");
    }

    const cell = currentGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    if (cell.isMine) {
      // Hit a mine! GAME OVER
      cell.exploded = true;
      cell.isRevealed = true;
      revealAllMines(currentGrid);
      setGrid(currentGrid);
      setGameStatus("lost");
      playExplosionSound();
      return;
    }

    // Normal click
    const reveals = new Set<string>();
    revealCellRecursive(r, c, currentGrid, reveals);
    if (reveals.size > 2) {
      playCascadeRevealSound();
    } else {
      playClickSound();
    }

    setGrid(currentGrid);

    // Check if Win
    if (checkWinCondition(currentGrid)) {
      setGameStatus("won");
      playVictorySound();
    }
  };

  // Reveal all mines upon death
  const revealAllMines = (targetGrid: Cell[][]) => {
    const { rows, cols } = activeParams;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = targetGrid[r][c];
        if (cell.isMine) {
          if (!cell.isFlagged) cell.isRevealed = true;
        } else if (cell.isFlagged) {
          // Flagged WRONGLY
          cell.isRevealed = true; // Mark to show it was wrong
        }
      }
    }
  };

  const checkWinCondition = (targetGrid: Cell[][]) => {
    const { rows, cols } = activeParams;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = targetGrid[r][c];
        // If there's an unrevealed safe cell, game is not won
        if (!cell.isMine && !cell.isRevealed) {
          return false;
        }
      }
    }
    return true;
  };

  // Flag cell toggle
  const handleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameStatus === "lost" || gameStatus === "won") return;

    const currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const cell = currentGrid[r][c];

    if (cell.isRevealed) return;

    const nextFlagged = !cell.isFlagged;
    cell.isFlagged = nextFlagged;

    playFlagSound();
    setGrid(currentGrid);
    setFlagsCount((prev) => prev + (nextFlagged ? 1 : -1));
  };

  // Double click chord reveal (clears surrounding cells if flags match count)
  const handleChordReveal = (r: number, c: number) => {
    if (gameStatus !== "playing") return;

    const cell = grid[r][c];
    if (!cell.isRevealed || cell.neighborMines === 0) return;

    const { rows, cols } = activeParams;
    let flagsCountAround = 0;

    // Count flags around
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isFlagged) {
          flagsCountAround++;
        }
      }
    }

    if (flagsCountAround === cell.neighborMines) {
      // Reveal all non-flagged cells around
      let currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
      let hitMine = false;
      const reveals = new Set<string>();

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = currentGrid[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
              if (neighbor.isMine) {
                neighbor.exploded = true;
                neighbor.isRevealed = true;
                hitMine = true;
              } else {
                revealCellRecursive(nr, nc, currentGrid, reveals);
              }
            }
          }
        }
      }

      if (hitMine) {
        revealAllMines(currentGrid);
        setGrid(currentGrid);
        setGameStatus("lost");
        playExplosionSound();
      } else {
        if (reveals.size > 2) {
          playCascadeRevealSound();
        } else {
          playClickSound();
        }
        setGrid(currentGrid);

        if (checkWinCondition(currentGrid)) {
          setGameStatus("won");
          playVictorySound();
        }
      }
    }
  };

  const getSmileEmoji = () => {
    if (gameStatus === "lost") return "😵";
    if (gameStatus === "won") return "😎";
    return "🙂";
  };

  // Custom validation parameters limits
  const handleCustomParamChange = (field: "rows" | "cols" | "mines", val: number) => {
    if (field === "rows") {
      const nextR = Math.max(8, Math.min(30, val));
      setCustomRows(nextR);
      setCustomMines((prev) => Math.min(prev, Math.floor((nextR * customCols) * 0.7)));
    } else if (field === "cols") {
      const nextC = Math.max(8, Math.min(35, val));
      setCustomCols(nextC);
      setCustomMines((prev) => Math.min(prev, Math.floor((customRows * nextC) * 0.7)));
    } else if (field === "mines") {
      const maxMines = Math.floor((customRows * customCols) * 0.7);
      setCustomMines(Math.max(1, Math.min(maxMines, val)));
    }
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

        /* Minesweeper variable system defaults */
        .tool-panel {
          --mines-board-bg: #1e1e24;
          --mines-board-border: 3px solid #2d2d30;
          --mines-board-radius: 8px;
          --mines-grid-bg: #2d2d30;
          --mines-grid-border: 2px solid #1e1e24;
          --mines-grid-gap: 2px;
          --mines-cell-unrevealed-bg: #3f3f46;
          --mines-cell-unrevealed-bt: 2.5px solid #52525b;
          --mines-cell-unrevealed-bl: 2.5px solid #52525b;
          --mines-cell-unrevealed-bb: 2.5px solid #27272a;
          --mines-cell-unrevealed-br: 2.5px solid #27272a;
          --mines-cell-unrevealed-active-bg: #333339;
          --mines-cell-unrevealed-active-border: 1px solid #27272a;
          --mines-cell-revealed-bg: #18181b;
          --mines-cell-revealed-border: 1.5px solid #27272a;
          --mines-cell-radius: 0px;
          --mines-cell-exploded-bg: #ef4444;
          --mines-cell-exploded-border: 1px solid #dc2626;
          --mines-status-bg: #121214;
          --mines-status-border: 1.5px solid #2d2d30;
          --mines-status-text-left: #ff4d4f;
          --mines-status-text-right: #ffe066;
          --mines-smile-bg: #2d2d30;
          --mines-smile-border: 2px solid #3f3f46;
          --mines-smile-radius: 50%;
        }

        /* Theme Overrides for Minesweeper Board Components */
        .tool-panel.theme-cyberpunk {
          --mines-board-bg: #18002a;
          --mines-board-border: 3px solid rgba(0, 240, 255, 0.3);
          --mines-board-radius: 8px;
          --mines-grid-bg: #24003d;
          --mines-grid-border: 2px solid #0d0015;
          --mines-grid-gap: 2px;
          --mines-cell-unrevealed-bg: #36005c;
          --mines-cell-unrevealed-bt: 2.5px solid #ff007f;
          --mines-cell-unrevealed-bl: 2.5px solid #ff007f;
          --mines-cell-unrevealed-bb: 2.5px solid #18002a;
          --mines-cell-unrevealed-br: 2.5px solid #18002a;
          --mines-cell-unrevealed-active-bg: #24003d;
          --mines-cell-unrevealed-active-border: 1px solid #00f0ff;
          --mines-cell-revealed-bg: #0d0015;
          --mines-cell-revealed-border: 1.5px solid rgba(0, 240, 255, 0.2);
          --mines-cell-radius: 4px;
          --mines-cell-exploded-bg: #ff007f;
          --mines-cell-exploded-border: 1px solid #ff007f;
          --mines-status-bg: #0d0015;
          --mines-status-border: 1.5px solid rgba(0, 240, 255, 0.3);
          --mines-status-text-left: #ff007f;
          --mines-status-text-right: #00f0ff;
          --mines-smile-bg: #18002a;
          --mines-smile-border: 2px solid #00f0ff;
          --mines-smile-radius: 4px;
        }

        .tool-panel.theme-retro {
          --mines-board-bg: #c0c0c0;
          --mines-board-border: 3px solid;
          --mines-board-radius: 0px;
          --mines-grid-bg: #808080;
          --mines-grid-border: 3px solid;
          --mines-grid-gap: 1px;
          --mines-cell-unrevealed-bg: #c0c0c0;
          --mines-cell-unrevealed-bt: 2.5px solid #fff;
          --mines-cell-unrevealed-bl: 2.5px solid #fff;
          --mines-cell-unrevealed-bb: 2.5px solid #808080;
          --mines-cell-unrevealed-br: 2.5px solid #808080;
          --mines-cell-unrevealed-active-bg: #c0c0c0;
          --mines-cell-unrevealed-active-border: 1px solid #808080;
          --mines-cell-revealed-bg: #c0c0c0;
          --mines-cell-revealed-border: 1px solid #808080;
          --mines-cell-radius: 0px;
          --mines-cell-exploded-bg: #ff0000;
          --mines-cell-exploded-border: 1px solid #ff0000;
          --mines-status-bg: #000000;
          --mines-status-text-left: #ff0000;
          --mines-status-text-right: #ff0000;
          --mines-smile-bg: #c0c0c0;
          --mines-smile-border: 2px solid;
          --mines-smile-radius: 0px;
        }

        /* Specific retro physical border style rules overrides */
        .theme-retro .board-wrapper {
          border-color: #fff #808080 #808080 #fff !important;
        }
        .theme-retro .board-grid {
          border-color: #808080 #fff #fff #808080 !important;
        }
        .theme-retro .status-panel {
          border: 2px inset #808080 !important;
          border-radius: 0px !important;
        }
        .theme-retro .smile-btn {
          border-color: #fff #808080 #808080 #fff !important;
          border-radius: 0px !important;
        }
        .theme-retro .smile-btn:active {
          border-color: #808080 #fff #fff #808080 !important;
        }

        .tool-panel.theme-forest {
          --mines-board-bg: #172e22;
          --mines-board-border: 3px solid rgba(163, 230, 53, 0.2);
          --mines-board-radius: 8px;
          --mines-grid-bg: #1e3c2c;
          --mines-grid-border: 2px solid #0f1e16;
          --mines-grid-gap: 2px;
          --mines-cell-unrevealed-bg: #2d5a27;
          --mines-cell-unrevealed-bt: 2.5px solid #a3e635;
          --mines-cell-unrevealed-bl: 2.5px solid #a3e635;
          --mines-cell-unrevealed-bb: 2.5px solid #172e22;
          --mines-cell-unrevealed-br: 2.5px solid #172e22;
          --mines-cell-unrevealed-active-bg: #1e3c2c;
          --mines-cell-unrevealed-active-border: 1px solid #10b981;
          --mines-cell-revealed-bg: #0f1e16;
          --mines-cell-revealed-border: 1.5px solid rgba(163, 230, 53, 0.2);
          --mines-cell-radius: 2px;
          --mines-cell-exploded-bg: #ef4444;
          --mines-cell-exploded-border: 1px solid #dc2626;
          --mines-status-bg: #0f1e16;
          --mines-status-border: 1.5px solid rgba(163, 230, 53, 0.2);
          --mines-status-text-left: #a3e635;
          --mines-status-text-right: #10b981;
          --mines-smile-bg: #172e22;
          --mines-smile-border: 2px solid #a3e635;
          --mines-smile-radius: 6px;
        }

        .tool-panel.theme-sunset {
          --mines-board-bg: #38201a;
          --mines-board-border: 3px solid rgba(249, 115, 22, 0.3);
          --mines-board-radius: 8px;
          --mines-grid-bg: #4b2a22;
          --mines-grid-border: 2px solid #251410;
          --mines-grid-gap: 2px;
          --mines-cell-unrevealed-bg: #d62828;
          --mines-cell-unrevealed-bt: 2.5px solid #facc15;
          --mines-cell-unrevealed-bl: 2.5px solid #facc15;
          --mines-cell-unrevealed-bb: 2.5px solid #38201a;
          --mines-cell-unrevealed-br: 2.5px solid #38201a;
          --mines-cell-unrevealed-active-bg: #4b2a22;
          --mines-cell-unrevealed-active-border: 1px solid #f97316;
          --mines-cell-revealed-bg: #251410;
          --mines-cell-revealed-border: 1.5px solid rgba(249, 115, 22, 0.2);
          --mines-cell-radius: 2px;
          --mines-cell-exploded-bg: #ef4444;
          --mines-cell-exploded-border: 1px solid #dc2626;
          --mines-status-bg: #251410;
          --mines-status-border: 1.5px solid rgba(249, 115, 22, 0.3);
          --mines-status-text-left: #f97316;
          --mines-status-text-right: #facc15;
          --mines-smile-bg: #38201a;
          --mines-smile-border: 2px solid #f97316;
          --mines-smile-radius: 6px;
        }

        .tool-panel.theme-cosmic {
          --mines-board-bg: #161226;
          --mines-board-border: 3px solid rgba(168, 85, 247, 0.3);
          --mines-board-radius: 8px;
          --mines-grid-bg: #211c38;
          --mines-grid-border: 2px solid #0b0914;
          --mines-grid-gap: 2px;
          --mines-cell-unrevealed-bg: #3c1b5b;
          --mines-cell-unrevealed-bt: 2.5px solid #ec4899;
          --mines-cell-unrevealed-bl: 2.5px solid #ec4899;
          --mines-cell-unrevealed-bb: 2.5px solid #161226;
          --mines-cell-unrevealed-br: 2.5px solid #161226;
          --mines-cell-unrevealed-active-bg: #211c38;
          --mines-cell-unrevealed-active-border: 1px solid #a855f7;
          --mines-cell-revealed-bg: #0b0914;
          --mines-cell-revealed-border: 1.5px solid rgba(168, 85, 247, 0.2);
          --mines-cell-radius: 4px;
          --mines-cell-exploded-bg: #ec4899;
          --mines-cell-exploded-border: 1px solid #ec4899;
          --mines-status-bg: #0b0914;
          --mines-status-border: 1.5px solid rgba(168, 85, 247, 0.3);
          --mines-status-text-left: #ec4899;
          --mines-status-text-right: #a855f7;
          --mines-smile-bg: #161226;
          --mines-smile-border: 2px solid #a855f7;
          --mines-smile-radius: 50%;
        }

        .board-wrapper {
          display: inline-block;
          background: var(--mines-board-bg);
          border: var(--mines-board-border);
          border-radius: var(--mines-board-radius);
          padding: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          overflow-x: auto;
          max-width: 100%;
        }

        .board-grid {
          display: grid;
          background: var(--mines-grid-bg);
          gap: var(--mines-grid-gap);
          border: var(--mines-grid-border);
          box-sizing: border-box;
          user-select: none;
        }

        .minesweeper-cell {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
        }

        .cell-unrevealed {
          background: var(--mines-cell-unrevealed-bg);
          border-top: var(--mines-cell-unrevealed-bt);
          border-left: var(--mines-cell-unrevealed-bl);
          border-bottom: var(--mines-cell-unrevealed-bb);
          border-right: var(--mines-cell-unrevealed-br);
          border-radius: var(--mines-cell-radius);
        }

        .cell-unrevealed:active {
          background: var(--mines-cell-unrevealed-active-bg);
          border: var(--mines-cell-unrevealed-active-border);
        }

        .cell-revealed {
          background: var(--mines-cell-revealed-bg);
          border: var(--mines-cell-revealed-border);
          border-radius: var(--mines-cell-radius);
        }

        .cell-exploded {
          background: var(--mines-cell-exploded-bg);
          border: var(--mines-cell-exploded-border);
          border-radius: var(--mines-cell-radius);
          animation: pulseBlast 0.5s infinite;
        }

        @keyframes pulseBlast {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); background: #ff4d4f; }
          100% { transform: scale(1); }
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
        <p style={{ marginTop: "0.5rem" }}>经典的 Windows 扫雷。鼠标左键翻开单元格，右键插旗标记雷，在翻开的数字单元格上“双击”可智能排开周围无雷区域。</p>
      </div>

      {/* Control bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>难度级别：</span>
          <button
            type="button"
            onClick={() => setDifficulty("easy")}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.85rem",
              background: difficulty === "easy" ? "var(--accent-primary, #ffe066)" : "none",
              color: difficulty === "easy" ? "var(--bg-base, #121214)" : "var(--text-primary, inherit)",
              border: difficulty === "easy" ? "1px solid var(--accent-primary, #ffe066)" : "1px solid transparent",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            初级 (9x9)
          </button>
          <button
            type="button"
            onClick={() => setDifficulty("medium")}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.85rem",
              background: difficulty === "medium" ? "var(--accent-primary, #ffe066)" : "none",
              color: difficulty === "medium" ? "var(--bg-base, #121214)" : "var(--text-primary, inherit)",
              border: difficulty === "medium" ? "1px solid var(--accent-primary, #ffe066)" : "1px solid transparent",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            中级 (16x16)
          </button>
          <button
            type="button"
            onClick={() => setDifficulty("hard")}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.85rem",
              background: difficulty === "hard" ? "var(--accent-primary, #ffe066)" : "none",
              color: difficulty === "hard" ? "var(--bg-base, #121214)" : "var(--text-primary, inherit)",
              border: difficulty === "hard" ? "1px solid var(--accent-primary, #ffe066)" : "1px solid transparent",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            高级 (30x16)
          </button>
          <button
            type="button"
            onClick={() => setDifficulty("custom")}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.85rem",
              background: difficulty === "custom" ? "var(--accent-primary, #ffe066)" : "none",
              color: difficulty === "custom" ? "var(--bg-base, #121214)" : "var(--text-primary, inherit)",
              border: difficulty === "custom" ? "1px solid var(--accent-primary, #ffe066)" : "1px solid transparent",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            自定义
          </button>
        </div>

        {/* Custom params fields */}
        {difficulty === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.5rem", background: "var(--input-bg, #1e1e24)", border: "1px solid var(--input-border, #2d2d30)", borderRadius: "4px" }}>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "2px", alignItems: "center", color: "var(--text-secondary)" }}>
              行数:
              <input
                type="number"
                min={8}
                max={30}
                value={customRows}
                onChange={(e) => handleCustomParamChange("rows", Number(e.target.value) || 8)}
                style={{
                  width: "45px",
                  padding: "2px 4px",
                  fontSize: "0.8rem",
                  background: "var(--bg-base, #0d0015)",
                  color: "var(--text-primary, inherit)",
                  border: "1px solid var(--border-default, #2d2d30)",
                  borderRadius: "4px"
                }}
              />
            </label>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "2px", alignItems: "center", color: "var(--text-secondary)" }}>
              列数:
              <input
                type="number"
                min={8}
                max={35}
                value={customCols}
                onChange={(e) => handleCustomParamChange("cols", Number(e.target.value) || 8)}
                style={{
                  width: "45px",
                  padding: "2px 4px",
                  fontSize: "0.8rem",
                  background: "var(--bg-base, #0d0015)",
                  color: "var(--text-primary, inherit)",
                  border: "1px solid var(--border-default, #2d2d30)",
                  borderRadius: "4px"
                }}
              />
            </label>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "2px", alignItems: "center", color: "var(--text-secondary)" }}>
              雷数:
              <input
                type="number"
                min={1}
                max={Math.floor(customRows*customCols*0.7)}
                value={customMines}
                onChange={(e) => handleCustomParamChange("mines", Number(e.target.value) || 1)}
                style={{
                  width: "45px",
                  padding: "2px 4px",
                  fontSize: "0.8rem",
                  background: "var(--bg-base, #0d0015)",
                  color: "var(--text-primary, inherit)",
                  border: "1px solid var(--border-default, #2d2d30)",
                  borderRadius: "4px"
                }}
              />
            </label>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            🔊 声音反馈
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={initBoard}
            style={{
              padding: "0.4rem 1rem",
              background: "var(--accent-primary, #ffe066)",
              color: "var(--bg-base, #121214)",
              fontWeight: "bold",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer"
            }}
          >
            重新加载
          </button>
        </div>
      </div>

      {/* Main Game Interface Board */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div className="board-wrapper">
          {/* Header Panel inside retro-board (Flags Counter, Smile Face Reset, Timer) */}
          <div
            className="status-panel"
            style={{
              background: "var(--mines-status-bg)",
              border: "var(--mines-status-border, 1.5px solid #2d2d30)",
              borderRadius: "4px",
              padding: "6px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              boxSizing: "border-box"
            }}
          >
            {/* Mines Left Counter */}
            <div style={{ color: "var(--mines-status-text-left)", fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "bold" }}>
              🚩 {String(Math.max(0, minesCount - flagsCount)).padStart(3, "0")}
            </div>

            {/* Restart face button */}
            <button
              type="button"
              className="smile-btn"
              onClick={initBoard}
              style={{
                fontSize: "1.3rem",
                width: "36px",
                height: "36px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--mines-smile-bg)",
                border: "var(--mines-smile-border)",
                borderRadius: "var(--mines-smile-radius)",
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
              }}
            >
              {getSmileEmoji()}
            </button>

            {/* Timer Counter */}
            <div style={{ color: "var(--mines-status-text-right)", fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "bold" }}>
              ⏱️ {String(Math.min(999, timer)).padStart(3, "0")}
            </div>
          </div>

          {/* Core Grid */}
          <div
            className="board-grid"
            style={{
              gridTemplateColumns: `repeat(${activeParams.cols}, 28px)`,
              gridTemplateRows: `repeat(${activeParams.rows}, 28px)`
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                
                // Content determines
                let display = "";
                let cellClass = "minesweeper-cell ";
                let inlineStyle: React.CSSProperties = {};

                if (cell.isRevealed) {
                   if (cell.isMine) {
                    display = "💣";
                    cellClass += cell.exploded ? "cell-exploded" : "cell-revealed";
                  } else if (cell.isFlagged) {
                    // This was flagged wrong
                    display = "❌";
                    cellClass += "cell-revealed";
                  } else {
                    cellClass += "cell-revealed";
                    if (cell.neighborMines > 0) {
                      display = String(cell.neighborMines);
                      inlineStyle.color = getNumberColor(cell.neighborMines, theme);
                    }
                  }
                } else {
                  cellClass += "cell-unrevealed";
                  if (cell.isFlagged) {
                    display = "🚩";
                    inlineStyle.color = "var(--mines-status-text-left, #ff4d4f)";
                  }
                }

                return (
                  <div
                    key={key}
                    className={cellClass}
                    style={inlineStyle}
                    onClick={() => handleReveal(rIdx, cIdx)}
                    onContextMenu={(e) => handleFlag(e, rIdx, cIdx)}
                    onDoubleClick={() => handleChordReveal(rIdx, cIdx)}
                  >
                    {display}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* End Game Messages Overlay */}
        {gameStatus === "lost" && (
          <p style={{ color: "#ff6b6b", fontWeight: "bold", fontSize: "1.1rem", marginTop: "1rem", animation: "pulse 1s infinite" }}>
            💀 踩到雷了！游戏结束，再接再厉。
          </p>
        )}
        {gameStatus === "won" && (
          <p style={{ color: "#4ade80", fontWeight: "bold", fontSize: "1.1rem", marginTop: "1rem" }}>
            🏆 恭喜通关！所有安全区域均已排查，耗时 {timer} 秒。
          </p>
        )}
      </div>
    </section>
  );
}
