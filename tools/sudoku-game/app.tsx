"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Difficulty = "easy" | "medium" | "hard";

const difficultySettings: Record<Difficulty, { name: string; clues: number }> = {
  easy: { name: "简单", clues: 42 },
  medium: { name: "中等", clues: 32 },
  hard: { name: "困难", clues: 24 },
};

const themes = [
  { id: "cosmic", name: "极光魅影", primary: "#a855f7", secondary: "#ec4899" },
  { id: "cyberpunk", name: "赛博霓虹", primary: "#00f0ff", secondary: "#ff007f" },
  { id: "classic", name: "经典琥珀", primary: "#ffe066", secondary: "#ff9f43" },
  { id: "forest", name: "绿野仙踪", primary: "#a3e635", secondary: "#10b981" },
  { id: "sunset", name: "落日金辉", primary: "#f97316", secondary: "#facc15" },
];

const themeConfig: Record<string, {
  primary: string;
  secondary: string;
  bgPanel: string;
  bgCard: string;
  textColor: string;
  textMuted: string;
  cellBorder: string;
  cellBorderThick: string;
  buttonText: string;
  accentDim: string;
  cellBg: string;
  cellBgInitial: string;
  cellBgSelected: string;
  cellBgHighlight: string;
  cellBgMatch: string;
  errorColor: string;
}> = {
  cosmic: {
    primary: "#a855f7",
    secondary: "#ec4899",
    bgPanel: "#0b0914",
    bgCard: "rgba(22, 18, 38, 0.8)",
    textColor: "#e9d5ff",
    textMuted: "#a78bfa",
    cellBorder: "rgba(168, 85, 247, 0.15)",
    cellBorderThick: "rgba(168, 85, 247, 0.4)",
    buttonText: "#0b0914",
    accentDim: "rgba(168, 85, 247, 0.08)",
    cellBg: "rgba(22, 18, 38, 0.3)",
    cellBgInitial: "rgba(168, 85, 247, 0.05)",
    cellBgSelected: "rgba(236, 72, 153, 0.3)",
    cellBgHighlight: "rgba(168, 85, 247, 0.15)",
    cellBgMatch: "rgba(236, 72, 153, 0.15)",
    errorColor: "#ef4444"
  },
  cyberpunk: {
    primary: "#00f0ff",
    secondary: "#ff007f",
    bgPanel: "#0d0015",
    bgCard: "rgba(24, 0, 42, 0.8)",
    textColor: "#00f0ff",
    textMuted: "#e00070",
    cellBorder: "rgba(0, 240, 255, 0.15)",
    cellBorderThick: "rgba(0, 240, 255, 0.4)",
    buttonText: "#0d0015",
    accentDim: "rgba(0, 240, 255, 0.08)",
    cellBg: "rgba(24, 0, 42, 0.3)",
    cellBgInitial: "rgba(0, 240, 255, 0.05)",
    cellBgSelected: "rgba(255, 0, 127, 0.3)",
    cellBgHighlight: "rgba(0, 240, 255, 0.15)",
    cellBgMatch: "rgba(255, 0, 127, 0.15)",
    errorColor: "#ff3333"
  },
  classic: {
    primary: "#ffe066",
    secondary: "#ff9f43",
    bgPanel: "#080f19",
    bgCard: "rgba(13, 24, 38, 0.8)",
    textColor: "#ffe066",
    textMuted: "#ffd43b",
    cellBorder: "rgba(255, 224, 102, 0.15)",
    cellBorderThick: "rgba(255, 224, 102, 0.4)",
    buttonText: "#080f19",
    accentDim: "rgba(255, 224, 102, 0.08)",
    cellBg: "rgba(13, 24, 38, 0.3)",
    cellBgInitial: "rgba(255, 224, 102, 0.05)",
    cellBgSelected: "rgba(255, 159, 67, 0.3)",
    cellBgHighlight: "rgba(255, 224, 102, 0.15)",
    cellBgMatch: "rgba(255, 159, 67, 0.15)",
    errorColor: "#f43f5e"
  },
  forest: {
    primary: "#a3e635",
    secondary: "#10b981",
    bgPanel: "#0f1e16",
    bgCard: "rgba(23, 46, 34, 0.8)",
    textColor: "#d9f99d",
    textMuted: "#34d399",
    cellBorder: "rgba(163, 230, 53, 0.15)",
    cellBorderThick: "rgba(163, 230, 53, 0.4)",
    buttonText: "#0f1e16",
    accentDim: "rgba(163, 230, 53, 0.08)",
    cellBg: "rgba(23, 46, 34, 0.3)",
    cellBgInitial: "rgba(163, 230, 53, 0.05)",
    cellBgSelected: "rgba(16, 185, 129, 0.3)",
    cellBgHighlight: "rgba(163, 230, 53, 0.15)",
    cellBgMatch: "rgba(16, 185, 129, 0.15)",
    errorColor: "#ef4444"
  },
  sunset: {
    primary: "#f97316",
    secondary: "#facc15",
    bgPanel: "#251410",
    bgCard: "rgba(56, 32, 26, 0.8)",
    textColor: "#fed7aa",
    textMuted: "#fde047",
    cellBorder: "rgba(249, 115, 22, 0.15)",
    cellBorderThick: "rgba(249, 115, 22, 0.4)",
    buttonText: "#251410",
    accentDim: "rgba(249, 115, 22, 0.08)",
    cellBg: "rgba(56, 32, 26, 0.3)",
    cellBgInitial: "rgba(249, 115, 22, 0.05)",
    cellBgSelected: "rgba(250, 204, 21, 0.3)",
    cellBgHighlight: "rgba(249, 115, 22, 0.15)",
    cellBgMatch: "rgba(250, 204, 21, 0.15)",
    errorColor: "#f43f5e"
  }
};

// Sudoku logic helpers
function createEmptyBoard(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isValid(board: number[][], r: number, c: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val) return false;
    if (board[i][c] === val) return false;
    const boxRow = 3 * Math.floor(r / 3) + Math.floor(i / 3);
    const boxCol = 3 * Math.floor(c / 3) + (i % 3);
    if (board[boxRow][boxCol] === val) return false;
  }
  return true;
}

function solveSudoku(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const val of nums) {
          if (isValid(board, r, c, val)) {
            board[r][c] = val;
            if (solveSudoku(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generatePuzzle(difficulty: Difficulty): { solution: number[][]; puzzle: number[][] } {
  const solution = createEmptyBoard();
  solveSudoku(solution);

  const puzzle = solution.map((row) => [...row]);
  const totalClues = difficultySettings[difficulty].clues;
  const cellsToRemove = 81 - totalClues;

  const positions = Array.from({ length: 81 }, (_, i) => ({
    r: Math.floor(i / 9),
    c: i % 9,
  })).sort(() => Math.random() - 0.5);

  let removed = 0;
  for (let i = 0; i < positions.length && removed < cellsToRemove; i++) {
    const { r, c } = positions[i];
    puzzle[r][c] = 0;
    removed++;
  }

  return { solution, puzzle };
}

export default function SudokuTool({ manifest }: ToolAppProps) {
  // Theme state
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("entertainment_theme") || "cosmic";
    }
    return "cosmic";
  });

  const activeTheme = themeConfig[theme] || themeConfig.cosmic;

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("entertainment_theme", newTheme);
  };

  // Sudoku Board States
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [solutionBoard, setSolutionBoard] = useState<number[][]>(() => createEmptyBoard());
  const [initialBoard, setInitialBoard] = useState<number[][]>(() => createEmptyBoard());
  const [currentBoard, setCurrentBoard] = useState<number[][]>(() => createEmptyBoard());
  const [notesBoard, setNotesBoard] = useState<Set<number>[][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()))
  );

  // UI Selection
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showConflicts, setShowConflicts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Time & Stats
  const [timer, setTimer] = useState(0);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number>>({
    easy: 0,
    medium: 0,
    hard: 0,
  });

  // Undo/Redo Stacks
  const [history, setHistory] = useState<{ board: number[][]; notes: Set<number>[][] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ board: number[][]; notes: Set<number>[][] }[]>([]);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load best times
  useEffect(() => {
    const savedTimes = localStorage.getItem("sudoku_best_times");
    if (savedTimes) {
      try {
        setBestTimes(JSON.parse(savedTimes));
      } catch (e) {}
    }
    startNewGame(difficulty);
  }, []);

  // Timer interval
  useEffect(() => {
    if (isPaused || gameWon || currentBoard.length === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, gameWon, currentBoard]);

  // Handle key events globally
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (selectedCell && !gameWon && !isPaused) {
        const { r, c } = selectedCell;
        // Key checking
        if (e.key >= "1" && e.key <= "9") {
          const val = parseInt(e.key);
          inputNumber(r, c, val);
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          clearCell(r, c);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCell({ r: Math.max(0, r - 1), c });
          playTickSound();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCell({ r: Math.min(8, r + 1), c });
          playTickSound();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSelectedCell({ r, c: Math.max(0, c - 1) });
          playTickSound();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSelectedCell({ r, c: Math.min(8, c + 1) });
          playTickSound();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isNoteMode, gameWon, isPaused, currentBoard, notesBoard]);

  // Audio synths
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
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  };

  const playInputSound = (isCorrect: boolean) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      if (isCorrect) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05); // E5
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(150, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
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
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio C4 to C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.04, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (e) {}
  };

  // Start new game
  const startNewGame = (diff: Difficulty) => {
    const { solution, puzzle } = generatePuzzle(diff);
    setDifficulty(diff);
    setSolutionBoard(solution);
    setInitialBoard(puzzle.map((r) => [...r]));
    setCurrentBoard(puzzle.map((r) => [...r]));
    setNotesBoard(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>())));
    setSelectedCell(null);
    setGameWon(false);
    setIsPaused(false);
    setTimer(0);
    setHistory([]);
    setRedoStack([]);
  };

  // Record state for undo
  const pushState = (board: number[][], notes: Set<number>[][]) => {
    const boardCopy = board.map((r) => [...r]);
    const notesCopy = notes.map((row) => row.map((cellSet) => new Set(cellSet)));
    setHistory((prev) => [...prev, { board: boardCopy, notes: notesCopy }]);
    setRedoStack([]); // Clear redo
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    playTickSound();
    const prev = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    // Save current to redo
    const currentCopy = currentBoard.map((r) => [...r]);
    const notesCopy = notesBoard.map((row) => row.map((cellSet) => new Set(cellSet)));
    setRedoStack((prevStack) => [...prevStack, { board: currentCopy, notes: notesCopy }]);

    setHistory(newHistory);
    setCurrentBoard(prev.board);
    setNotesBoard(prev.notes);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    playTickSound();
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    // Save current to history
    const currentCopy = currentBoard.map((r) => [...r]);
    const notesCopy = notesBoard.map((row) => row.map((cellSet) => new Set(cellSet)));
    setHistory((prevHist) => [...prevHist, { board: currentCopy, notes: notesCopy }]);

    setRedoStack(newRedo);
    setCurrentBoard(next.board);
    setNotesBoard(next.notes);
  };

  // Actions
  const inputNumber = (r: number, c: number, val: number) => {
    if (initialBoard[r][c] !== 0) return; // Initial cells are locked

    pushState(currentBoard, notesBoard);

    if (isNoteMode) {
      const nextNotes = notesBoard.map((row, rIndex) =>
        row.map((cellSet, cIndex) => {
          if (rIndex === r && cIndex === c) {
            const nextSet = new Set(cellSet);
            if (nextSet.has(val)) {
              nextSet.delete(val);
            } else {
              nextSet.add(val);
            }
            return nextSet;
          }
          return cellSet;
        })
      );
      setNotesBoard(nextNotes);
      // Clear value if setting notes
      const nextBoard = currentBoard.map((row, rIndex) =>
        row.map((cellVal, cIndex) => (rIndex === r && cIndex === c ? 0 : cellVal))
      );
      setCurrentBoard(nextBoard);
      playTickSound();
    } else {
      const isCorrectVal = solutionBoard[r][c] === val;
      playInputSound(isCorrectVal);

      // Set cell value, clear notes
      const nextBoard = currentBoard.map((row, rIndex) =>
        row.map((cellVal, cIndex) => (rIndex === r && cIndex === c ? val : cellVal))
      );

      const nextNotes = notesBoard.map((row, rIndex) =>
        row.map((cellSet, cIndex) => {
          if (rIndex === r && cIndex === c) {
            return new Set<number>();
          }
          return cellSet;
        })
      );

      setCurrentBoard(nextBoard);
      setNotesBoard(nextNotes);

      // Check win condition
      checkWinCondition(nextBoard);
    }
  };

  const clearCell = (r: number, c: number) => {
    if (initialBoard[r][c] !== 0) return;
    pushState(currentBoard, notesBoard);

    const nextBoard = currentBoard.map((row, rIndex) =>
      row.map((cellVal, cIndex) => (rIndex === r && cIndex === c ? 0 : cellVal))
    );
    const nextNotes = notesBoard.map((row, rIndex) =>
      row.map((cellSet, cIndex) => {
        if (rIndex === r && cIndex === c) {
          return new Set<number>();
        }
          return cellSet;
      })
    );

    setCurrentBoard(nextBoard);
    setNotesBoard(nextNotes);
    playTickSound();
  };

  const checkWinCondition = (board: number[][]) => {
    // Verify complete match with solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solutionBoard[r][c]) {
          return;
        }
      }
    }

    // Win!
    setGameWon(true);
    playWinSound();

    // Check best time
    const currentBest = bestTimes[difficulty];
    if (currentBest === 0 || timer < currentBest) {
      const nextBest = { ...bestTimes, [difficulty]: timer };
      setBestTimes(nextBest);
      localStorage.setItem("sudoku_best_times", JSON.stringify(nextBest));
    }
  };

  // Conflict scanning
  const getConflicts = () => {
    const conflicts = new Set<string>(); // "r-c"
    if (!showConflicts) return conflicts;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = currentBoard[r][c];
        if (val === 0) continue;

        // Check row
        for (let i = 0; i < 9; i++) {
          if (i !== c && currentBoard[r][i] === val) {
            conflicts.add(`${r}-${c}`);
            conflicts.add(`${r}-${i}`);
          }
        }
        // Check col
        for (let i = 0; i < 9; i++) {
          if (i !== r && currentBoard[i][c] === val) {
            conflicts.add(`${r}-${c}`);
            conflicts.add(`${i}-${c}`);
          }
        }
        // Check box
        const br = 3 * Math.floor(r / 3);
        const bc = 3 * Math.floor(c / 3);
        for (let i = 0; i < 9; i++) {
          const boxR = br + Math.floor(i / 3);
          const boxC = bc + (i % 3);
          if ((boxR !== r || boxC !== c) && currentBoard[boxR][boxC] === val) {
            conflicts.add(`${r}-${c}`);
            conflicts.add(`${boxR}-${boxC}`);
          }
        }
      }
    }
    return conflicts;
  };

  const conflicts = getConflicts();

  // Selected cell metrics
  const selectedVal = selectedCell ? currentBoard[selectedCell.r][selectedCell.c] : 0;

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: activeTheme.textColor,
        background: activeTheme.bgPanel,
        padding: "2rem 1.5rem",
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}
    >
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .sudoku-container {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sudoku-cell {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          font-weight: 700;
          cursor: pointer;
          user-select: none;
          transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .sudoku-cell:focus {
          outline: none;
        }
        .note-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          width: 100%;
          height: 100%;
          padding: 2px;
          box-sizing: border-box;
        }
        .note-digit {
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          opacity: 0.6;
        }
        .btn-theme-sudoku {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid ${activeTheme.primary}44;
          background: rgba(255, 255, 255, 0.03);
          color: ${activeTheme.textColor};
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-theme-sudoku:hover {
          background: ${activeTheme.accentDim};
          border-color: ${activeTheme.primary};
        }
        .btn-theme-sudoku.active {
          background: ${activeTheme.primary};
          color: ${activeTheme.buttonText};
          border-color: ${activeTheme.primary};
          font-weight: bold;
        }
      `}} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "600px", width: "100%" }}>
        {/* Top bar controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: activeTheme.primary, margin: 0 }}>
              数独大师
            </h2>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0.25rem 0 0 0" }}>
              轻量逻辑益智数独谜题
            </p>
          </div>

          {/* Theme switcher */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`btn-theme-sudoku ${theme === t.id ? "active" : ""}`}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  borderRadius: "4px"
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats card */}
        <div
          style={{
            background: activeTheme.bgCard,
            border: `1px solid ${activeTheme.primary}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.9rem" }}>
              难度:
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              {(Object.keys(difficultySettings) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => startNewGame(d)}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "4px",
                    border: `1px solid ${difficulty === d ? activeTheme.primary : "transparent"}`,
                    background: difficulty === d ? activeTheme.accentDim : "transparent",
                    color: difficulty === d ? activeTheme.primary : activeTheme.textColor,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: difficulty === d ? "bold" : "normal"
                  }}
                >
                  {difficultySettings[d].name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>最高纪录</span>
              <span style={{ fontSize: "1rem", fontWeight: "bold", color: activeTheme.secondary }}>
                {bestTimes[difficulty] > 0 ? formatTime(bestTimes[difficulty]) : "--:--"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "80px" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>当前计时</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: activeTheme.primary }}>
                {formatTime(timer)}
              </span>
            </div>
          </div>
        </div>

        {/* Sudoku Grid Wrapper */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
          {/* Main Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(9, 1fr)",
              gridTemplateRows: "repeat(9, 1fr)",
              border: `3px solid ${activeTheme.primary}`,
              background: activeTheme.bgCard,
              borderRadius: "8px",
              overflow: "hidden",
              width: "100%",
              height: "100%"
            }}
          >
            {currentBoard.map((row, r) =>
              row.map((val, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isInitial = initialBoard[r][c] !== 0;
                const cellKey = `${r}-${c}`;
                const hasConflict = conflicts.has(cellKey);

                // Highlight status
                let isHighlighted = false;
                if (selectedCell) {
                  const inRow = selectedCell.r === r;
                  const inCol = selectedCell.c === c;
                  const inBox = Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                                Math.floor(selectedCell.c / 3) === Math.floor(c / 3);
                  isHighlighted = inRow || inCol || inBox;
                }

                const isValueMatch = selectedVal > 0 && val === selectedVal;

                // Determine background color
                let bg = activeTheme.cellBg;
                if (isInitial) bg = activeTheme.cellBgInitial;
                if (isHighlighted) bg = activeTheme.cellBgHighlight;
                if (isValueMatch) bg = activeTheme.cellBgMatch;
                if (isSelected) bg = activeTheme.cellBgSelected;

                // Thick borders for 3x3 blocks
                const borderRight = (c === 2 || c === 5) ? `3px solid ${activeTheme.primary}88` : `1px solid ${activeTheme.cellBorder}`;
                const borderBottom = (r === 2 || r === 5) ? `3px solid ${activeTheme.primary}88` : `1px solid ${activeTheme.cellBorder}`;

                return (
                  <div
                    key={cellKey}
                    onClick={() => {
                      if (!gameWon && !isPaused) {
                        setSelectedCell({ r, c });
                        playTickSound();
                      }
                    }}
                    className="sudoku-cell"
                    style={{
                      background: bg,
                      borderRight,
                      borderBottom,
                      color: hasConflict ? activeTheme.errorColor : (isInitial ? activeTheme.textColor : activeTheme.secondary),
                      fontWeight: isInitial ? "800" : "600",
                      filter: isPaused ? "blur(4px)" : "none",
                      textShadow: isSelected ? `0 0 10px ${activeTheme.secondary}` : "none"
                    }}
                  >
                    {val > 0 ? (
                      val
                    ) : (
                      // Render Notes
                      <div className="note-grid">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <div key={digit} className="note-digit" style={{ color: activeTheme.primary }}>
                            {notesBoard[r]?.[c]?.has(digit) ? digit : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pause overlay */}
          {isPaused && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(10, 10, 16, 0.85)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10
              }}
            >
              <h3 style={{ fontSize: "2rem", color: activeTheme.primary, fontWeight: "bold", margin: "0 0 1rem 0" }}>
                游戏已暂停
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsPaused(false);
                  playTickSound();
                }}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: activeTheme.primary,
                  color: activeTheme.buttonText,
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                继续挑战
              </button>
            </div>
          )}

          {/* Win overlay */}
          {gameWon && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(10, 10, 16, 0.9)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10
              }}
            >
              <h3 style={{ fontSize: "2.4rem", color: activeTheme.secondary, fontWeight: "bold", margin: "0 0 0.5rem 0", textShadow: `0 0 12px ${activeTheme.secondary}` }}>
                🎉 挑战成功 🎉
              </h3>
              <p style={{ margin: "0 0 1.5rem 0", color: activeTheme.textColor }}>
                用时 {formatTime(timer)}，恭喜你解开了这道难题！
              </p>
              <button
                type="button"
                onClick={() => {
                  startNewGame(difficulty);
                  playTickSound();
                }}
                style={{
                  padding: "0.6rem 1.8rem",
                  background: activeTheme.primary,
                  color: activeTheme.buttonText,
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                开始新局
              </button>
            </div>
          )}
        </div>

        {/* Input keypad & Action controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Controls: undo, redo, note, erase, pause */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${activeTheme.primary}44`,
                  background: "rgba(255, 255, 255, 0.03)",
                  color: activeTheme.textColor,
                  fontSize: "0.85rem",
                  cursor: history.length === 0 ? "not-allowed" : "pointer",
                  opacity: history.length === 0 ? 0.4 : 1
                }}
              >
                撤销
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${activeTheme.primary}44`,
                  background: "rgba(255, 255, 255, 0.03)",
                  color: activeTheme.textColor,
                  fontSize: "0.85rem",
                  cursor: redoStack.length === 0 ? "not-allowed" : "pointer",
                  opacity: redoStack.length === 0 ? 0.4 : 1
                }}
              >
                重做
              </button>
              <button
                onClick={() => {
                  setIsNoteMode(!isNoteMode);
                  playTickSound();
                }}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${activeTheme.primary}`,
                  background: isNoteMode ? activeTheme.primary : "transparent",
                  color: isNoteMode ? activeTheme.buttonText : activeTheme.primary,
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                草稿笔记: {isNoteMode ? "开" : "关"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  if (selectedCell) clearCell(selectedCell.r, selectedCell.c);
                }}
                disabled={!selectedCell || initialBoard[selectedCell.r][selectedCell.c] !== 0}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${activeTheme.primary}44`,
                  background: "rgba(255, 255, 255, 0.03)",
                  color: activeTheme.textColor,
                  fontSize: "0.85rem",
                  cursor: (!selectedCell || initialBoard[selectedCell.r][selectedCell.c] !== 0) ? "not-allowed" : "pointer",
                  opacity: (!selectedCell || initialBoard[selectedCell.r][selectedCell.c] !== 0) ? 0.4 : 1
                }}
              >
                擦除
              </button>
              <button
                onClick={() => {
                  setIsPaused(!isPaused);
                  playTickSound();
                }}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${activeTheme.primary}44`,
                  background: "rgba(255, 255, 255, 0.03)",
                  color: activeTheme.textColor,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                {isPaused ? "继续" : "暂停"}
              </button>
            </div>
          </div>

          {/* Number panel */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(9, 1fr)",
              gap: "6px",
              width: "100%"
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (selectedCell && !gameWon && !isPaused) {
                    inputNumber(selectedCell.r, selectedCell.c, num);
                  }
                }}
                style={{
                  padding: "0.8rem 0",
                  fontSize: "1.3rem",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: `1px solid ${activeTheme.primary}44`,
                  background: activeTheme.bgCard,
                  color: activeTheme.primary,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent loss of focus
              >
                {num}
              </button>
            ))}
          </div>

          {/* Assistant checkboxes */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", fontSize: "0.75rem", opacity: 0.75, marginTop: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showConflicts}
                onChange={(e) => {
                  setShowConflicts(e.target.checked);
                  playTickSound();
                }}
                style={{ cursor: "pointer" }}
              />
              实时排查冲突/重复数字
            </label>

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
              启用拟真音效
            </label>
          </div>
        </div>

        {/* How to play card */}
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: activeTheme.accentDim,
            border: `1px dashed ${activeTheme.primary}44`,
            borderRadius: "6px",
            fontSize: "0.85rem",
            lineHeight: "1.4"
          }}
        >
          🎮 <strong>操作技巧：</strong>
          <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.2rem" }}>
            <li>点击棋盘任意格子选中它，可以通过<strong>键盘 1-9</strong> 填数，<strong>Backspace/Delete</strong> 擦除。</li>
            <li>在键盘上使用<strong>方向键 (↑ ↓ ← →)</strong> 可以快速移动选中格子。</li>
            <li>开启<strong>草稿笔记</strong>可在格子内记录候选数字，再次点击或输入相同数字可取消标记。</li>
            <li>相同数字在棋盘上会自动高亮，助你更快看清布局！</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
