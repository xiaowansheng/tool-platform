"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const themes = [
  { id: "classic", name: "经典", primary: "#ffe066", secondary: "#ff9f43" },
  { id: "cyberpunk", name: "赛博霓虹", primary: "#00f0ff", secondary: "#ff007f" },
  { id: "retro", name: "复古像素", primary: "#ff6b6b", secondary: "#4ecdc4" },
  { id: "forest", name: "绿野仙踪", primary: "#a3e635", secondary: "#10b981" },
  { id: "sunset", name: "落日金辉", primary: "#f97316", secondary: "#facc15" },
  { id: "cosmic", name: "极光魅影", primary: "#a855f7", secondary: "#ec4899" }
];

const themeConfig: Record<string, { primary: string; secondary: string; bgPanel: string; bgCard: string; textColor: string; buttonText: string; accentDim: string }> = {
  classic: { primary: "#ffe066", secondary: "#ff9f43", bgPanel: "#080f19", bgCard: "rgba(13, 24, 38, 0.78)", textColor: "#ffe066", buttonText: "#121214", accentDim: "rgba(255, 224, 102, 0.05)" },
  cyberpunk: { primary: "#00f0ff", secondary: "#ff007f", bgPanel: "#0d0015", bgCard: "rgba(24, 0, 42, 0.8)", textColor: "#00f0ff", buttonText: "#0d0015", accentDim: "rgba(0, 240, 255, 0.1)" },
  retro: { primary: "#ff6b6b", secondary: "#4ecdc4", bgPanel: "#1a1c1e", bgCard: "#2d3135", textColor: "#ff6b6b", buttonText: "#1a1c1e", accentDim: "rgba(255, 107, 107, 0.1)" },
  forest: { primary: "#a3e635", secondary: "#10b981", bgPanel: "#0f1e16", bgCard: "#172e22", textColor: "#a3e635", buttonText: "#0f1e16", accentDim: "rgba(163, 230, 53, 0.1)" },
  sunset: { primary: "#f97316", secondary: "#facc15", bgPanel: "#251410", bgCard: "#38201a", textColor: "#f97316", buttonText: "#251410", accentDim: "rgba(249, 115, 22, 0.1)" },
  cosmic: { primary: "#a855f7", secondary: "#ec4899", bgPanel: "#0b0914", bgCard: "#161226", textColor: "#c084fc", buttonText: "#0b0914", accentDim: "rgba(168, 85, 247, 0.1)" }
};

export default function Game2048Tool({ manifest }: ToolAppProps) {
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

  const [boardSize, setBoardSize] = useState<3 | 4 | 5>(4);
  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Key tracking to highlight merges or new tiles
  const [newTiles, setNewTiles] = useState<string[]>([]); // "row-col" format
  const [mergedTiles, setMergedTiles] = useState<string[]>([]);

  // Mobile Touch Swiping Coordinates
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load High Score on board size changes
  useEffect(() => {
    const saved = localStorage.getItem(`2048_highscore_v2_${boardSize}`);
    setHighScore(saved ? Number(saved) : 0);
    initGame(boardSize);
  }, [boardSize]);

  // Audio synths
  const playSlideSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const playMergeSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Play a quick dual harmony ping
      const now = ctx.currentTime;
      [523.25, 659.25].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.12);
      });
    } catch (e) {}
  };

  const playGameOverSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4 sad desc
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.05, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
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
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.06, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } catch (e) {}
  };

  // Initialize a blank board and add 2 initial tiles
  const initGame = (size: number) => {
    const newGrid = Array.from({ length: size }, () => Array(size).fill(0));
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setKeepPlaying(false);
    setNewTiles([]);
    setMergedTiles([]);

    // Add 2 tiles
    addRandomTile(newGrid, size);
    addRandomTile(newGrid, size);
    setGrid(newGrid);
  };

  // Add random tile (90% chance of 2, 10% chance of 4)
  const addRandomTile = (targetGrid: number[][], size: number) => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (targetGrid[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length > 0) {
      const idx = Math.floor(Math.random() * emptyCells.length);
      const { r, c } = emptyCells[idx];
      targetGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
      setNewTiles((prev) => [...prev, `${r}-${c}`]);
    }
  };

  // Rotates grid 90 degrees clockwise
  const rotateClockwise = (targetGrid: number[][]) => {
    const size = targetGrid.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        rotated[c][size - 1 - r] = targetGrid[r][c];
      }
    }
    return rotated;
  };

  // Slide a row to the left and merge matching values
  const slideLeft = (row: number[], rIdx: number, size: number, onMerge: () => void) => {
    // 1. Filter out zeros
    const filtered = row.filter((val) => val !== 0);
    const newRow = Array(size).fill(0);

    let writeIdx = 0;
    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        // Merge!
        const mergedVal = filtered[i] * 2;
        newRow[writeIdx] = mergedVal;
        setMergedTiles((prev) => [...prev, `${rIdx}-${writeIdx}`]);
        onMerge();
        
        // Update score
        setScore((prev) => {
          const nextScore = prev + mergedVal;
          if (nextScore > highScore) {
            setHighScore(nextScore);
            localStorage.setItem(`2048_highscore_v2_${boardSize}`, String(nextScore));
          }
          return nextScore;
        });

        // Check if reached 2048
        if (mergedVal === 2048 && !gameWon && !keepPlaying) {
          setGameWon(true);
          playWinSound();
        }

        i++; // skip next since it's merged
      } else {
        newRow[writeIdx] = filtered[i];
      }
      writeIdx++;
    }

    return newRow;
  };

  // Check if grid has changed
  const gridsAreEqual = (g1: number[][], g2: number[][]) => {
    if (g1.length !== g2.length) return false;
    for (let r = 0; r < g1.length; r++) {
      for (let c = 0; c < g1[r].length; c++) {
        if (g1[r][c] !== g2[r][c]) return false;
      }
    }
    return true;
  };

  // Check if any moves are available (non-empty spaces or matching neighbors)
  const isMovesAvailable = (targetGrid: number[][]) => {
    const size = targetGrid.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (targetGrid[r][c] === 0) return true;
        // Check neighbors
        if (r < size - 1 && targetGrid[r][c] === targetGrid[r + 1][c]) return true;
        if (c < size - 1 && targetGrid[r][c] === targetGrid[r][c + 1]) return true;
      }
    }
    return false;
  };

  // Handle slide movement in any of the 4 directions
  const move = (direction: "up" | "down" | "left" | "right") => {
    if (gameOver) return;

    let currentGrid = grid.map((row) => [...row]);
    const size = boardSize;
    let didMerge = false;
    const triggerMergeSound = () => { didMerge = true; };

    setNewTiles([]);
    setMergedTiles([]);

    // Rotate board to make any slide look like a slide to the left
    let rotations = 0;
    if (direction === "up") rotations = 3;    // rotate 270 deg (counterclockwise)
    else if (direction === "right") rotations = 2; // rotate 180 deg
    else if (direction === "down") rotations = 1;  // rotate 90 deg (clockwise)

    for (let i = 0; i < rotations; i++) {
      currentGrid = rotateClockwise(currentGrid);
    }

    // Slide left
    const nextGrid = currentGrid.map((row, r) => slideLeft(row, r, size, triggerMergeSound));

    // Rotate back to original orientation
    let finalGrid = nextGrid;
    const reverseRotations = (4 - rotations) % 4;
    for (let i = 0; i < reverseRotations; i++) {
      finalGrid = rotateClockwise(finalGrid);
    }

    if (!gridsAreEqual(grid, finalGrid)) {
      if (didMerge) {
        playMergeSound();
      } else {
        playSlideSound();
      }

      // Add a new random tile
      addRandomTile(finalGrid, size);
      setGrid(finalGrid);

      // Check for Game Over
      if (!isMovesAvailable(finalGrid)) {
        setGameOver(true);
        playGameOverSound();
      }
    }
  };

  // Listen to keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      if (isWonOverlayActive) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          move("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          move("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          move("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          move("right");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [grid, gameOver, gameWon, keepPlaying, boardSize]);

  // Touch Swipe Handlers for Mobile Devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (Math.max(absX, absY) > 35) { // Minimum swipe length threshold
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) move("right");
        else move("left");
      } else {
        // Vertical swipe
        if (deltaY > 0) move("down");
        else move("up");
      }
    }
    touchStartRef.current = null;
  };

  const isWonOverlayActive = gameWon && !keepPlaying;

  // Colors based on Tile Value and Theme
  const getTileStyles = (value: number) => {
    const classicMap: Record<number, { bg: string; color: string; shadow?: string }> = {
      2: { bg: "#eee4da", color: "#776e65" },
      4: { bg: "#ede0c8", color: "#776e65" },
      8: { bg: "#f2b179", color: "#f9f6f2" },
      16: { bg: "#f59563", color: "#f9f6f2" },
      32: { bg: "#f67c5f", color: "#f9f6f2" },
      64: { bg: "#f65e3b", color: "#f9f6f2" },
      128: { bg: "#edcf72", color: "#f9f6f2", shadow: "0 0 12px rgba(237, 207, 114, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.25)" },
      256: { bg: "#edcc61", color: "#f9f6f2", shadow: "0 0 16px rgba(237, 204, 97, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.25)" },
      512: { bg: "#edc850", color: "#f9f6f2", shadow: "0 0 20px rgba(237, 200, 80, 0.65), inset 0 0 0 1px rgba(255, 255, 255, 0.25)" },
      1024: { bg: "#edc53f", color: "#f9f6f2", shadow: "0 0 24px rgba(237, 197, 63, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.25)" },
      2048: { bg: "#edc22e", color: "#f9f6f2", shadow: "0 0 32px rgba(237, 194, 46, 0.95), inset 0 0 0 1px rgba(255, 255, 255, 0.25)" }
    };

    const cyberpunkMap: Record<number, { bg: string; color: string; shadow?: string }> = {
      2: { bg: "#1a0826", color: "#ff007f", shadow: "0 0 8px rgba(255, 0, 127, 0.3)" },
      4: { bg: "#0d2030", color: "#00f0ff", shadow: "0 0 8px rgba(0, 240, 255, 0.3)" },
      8: { bg: "#ff007f", color: "#ffffff", shadow: "0 0 12px rgba(255, 0, 127, 0.6)" },
      16: { bg: "#00f0ff", color: "#000000", shadow: "0 0 12px rgba(0, 240, 255, 0.6)" },
      32: { bg: "#9d00ff", color: "#ffffff", shadow: "0 0 12px rgba(157, 0, 255, 0.6)" },
      64: { bg: "#fffb00", color: "#000000", shadow: "0 0 12px rgba(255, 251, 0, 0.6)" },
      128: { bg: "#00ff66", color: "#000000", shadow: "0 0 16px rgba(0, 255, 102, 0.6)" },
      256: { bg: "#ff5500", color: "#ffffff", shadow: "0 0 16px rgba(255, 85, 0, 0.6)" },
      512: { bg: "#e2d5f0", color: "#0d0015", shadow: "0 0 20px rgba(226, 213, 240, 0.6)" },
      1024: { bg: "#24003d", color: "#00f0ff", shadow: "0 0 24px rgba(0, 240, 255, 0.8)" },
      2048: { bg: "#ff007f", color: "#fffb00", shadow: "0 0 32px rgba(255, 0, 127, 0.9)" }
    };

    const retroMap: Record<number, { bg: string; color: string; shadow?: string }> = {
      2: { bg: "#2d3135", color: "#ffffff" },
      4: { bg: "#3d4349", color: "#ffffff" },
      8: { bg: "#ff6b6b", color: "#ffffff" },
      16: { bg: "#4ecdc4", color: "#1a1c1e" },
      32: { bg: "#ffe66d", color: "#1a1c1e" },
      64: { bg: "#1a535c", color: "#ffffff" },
      128: { bg: "#ff6b6b", color: "#ffffff" },
      256: { bg: "#4ecdc4", color: "#1a1c1e" },
      512: { bg: "#ffe66d", color: "#1a1c1e" },
      1024: { bg: "#1a535c", color: "#ffffff" },
      2048: { bg: "#ff6b6b", color: "#ffe66d" }
    };

    const forestMap: Record<number, { bg: string; color: string; shadow?: string }> = {
      2: { bg: "#f4f9f4", color: "#2d5a27" },
      4: { bg: "#e8efe9", color: "#2d5a27" },
      8: { bg: "#d8f3dc", color: "#1b4332" },
      16: { bg: "#b7e4c7", color: "#1b4332" },
      32: { bg: "#95d5b2", color: "#081c15" },
      64: { bg: "#74c69d", color: "#081c15" },
      128: { bg: "#52b788", color: "#ffffff", shadow: "0 0 10px rgba(82, 183, 136, 0.4)" },
      256: { bg: "#40916c", color: "#ffffff", shadow: "0 0 12px rgba(64, 145, 108, 0.5)" },
      512: { bg: "#2d6a4f", color: "#ffffff", shadow: "0 0 14px rgba(45, 106, 79, 0.6)" },
      1024: { bg: "#1b4332", color: "#a3e635", shadow: "0 0 16px rgba(27, 67, 50, 0.7)" },
      2048: { bg: "#081c15", color: "#a3e635", shadow: "0 0 20px rgba(8, 28, 21, 0.8)" }
    };

    const sunsetMap: Record<number, { bg: string; color: string; shadow?: string }> = {
      2: { bg: "#fdf3f0", color: "#bc6c25" },
      4: { bg: "#faeae6", color: "#bc6c25" },
      8: { bg: "#fec5bb", color: "#d62828" },
      16: { bg: "#fcd5ce", color: "#d62828" },
      32: { bg: "#ffb5a7", color: "#ffffff" },
      64: { bg: "#ff9f1c", color: "#ffffff" },
      128: { bg: "#ffbf69", color: "#ffffff", shadow: "0 0 10px rgba(255, 191, 105, 0.4)" },
      256: { bg: "#f77f00", color: "#ffffff", shadow: "0 0 12px rgba(247, 127, 0, 0.5)" },
      512: { bg: "#fcbf49", color: "#121214", shadow: "0 0 14px rgba(252, 191, 73, 0.6)" },
      1024: { bg: "#d62828", color: "#ffffff", shadow: "0 0 16px rgba(214, 40, 40, 0.7)" },
      2048: { bg: "#251410", color: "#fcbf49", shadow: "0 0 20px rgba(37, 20, 16, 0.8)" }
    };

    const cosmicMap: Record<number, { bg: string; color: string; shadow?: string }> = {
      2: { bg: "#f3e8ff", color: "#6b21a8" },
      4: { bg: "#faf5ff", color: "#6b21a8" },
      8: { bg: "#e9d5ff", color: "#581c87" },
      16: { bg: "#d8b4fe", color: "#581c87" },
      32: { bg: "#c084fc", color: "#ffffff" },
      64: { bg: "#a855f7", color: "#ffffff" },
      128: { bg: "#f472b6", color: "#ffffff", shadow: "0 0 10px rgba(244, 114, 182, 0.4)" },
      256: { bg: "#ec4899", color: "#ffffff", shadow: "0 0 12px rgba(236, 72, 153, 0.5)" },
      512: { bg: "#db2777", color: "#ffffff", shadow: "0 0 14px rgba(219, 39, 119, 0.6)" },
      1024: { bg: "#6b11b7", color: "#00e8e8", shadow: "0 0 16px rgba(107, 17, 183, 0.7)" },
      2048: { bg: "#0b0914", color: "#ec4899", shadow: "0 0 20px rgba(11, 9, 20, 0.8)" }
    };

    const themeMaps: Record<string, Record<number, { bg: string; color: string; shadow?: string }>> = {
      cyberpunk: cyberpunkMap,
      retro: retroMap,
      forest: forestMap,
      sunset: sunsetMap,
      cosmic: cosmicMap
    };

    const map = themeMaps[theme] || classicMap;
    const style = map[value];
    if (style) return style;

    if (value > 2048) {
      return {
        bg: theme === "cyberpunk" ? "#0f001b" : theme === "retro" ? "#000000" : "#3c3a32",
        color: "#ffffff",
        shadow: "0 0 36px rgba(0,0,0,0.5)"
      };
    }

    return { bg: "var(--bg-muted)", color: "var(--text-primary)" };
  };

  return (
    <section className={`tool-panel theme-${theme}`}>
      {/* Pop animation styling in scoped CSS style tag */}
      <style>{`
        .tile-cell {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tile-active {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          transition: transform 0.1s ease-in-out;
        }

        .tile-new {
          animation: popNew 0.15s ease-out;
        }

        .tile-merge {
          animation: popMerge 0.2s ease-in-out;
        }

        @keyframes popNew {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }

        @keyframes popMerge {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
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
        <p style={{ marginTop: "0.5rem" }}>通过合并相同的数字方块来合成 2048。支持使用电脑方向键 (↑↓←→ / WASD) 或在手机屏幕上划动进行操作。</p>
      </div>

      {/* Control bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>棋盘规格：</span>
          <button type="button" onClick={() => setBoardSize(3)} style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: boardSize === 3 ? (themeConfig[theme]?.primary || "#ffe066") : "none", color: boardSize === 3 ? (themeConfig[theme]?.buttonText || "#121214") : "inherit" }}>3x3 极速</button>
          <button type="button" onClick={() => setBoardSize(4)} style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: boardSize === 4 ? (themeConfig[theme]?.primary || "#ffe066") : "none", color: boardSize === 4 ? (themeConfig[theme]?.buttonText || "#121214") : "inherit" }}>4x4 经典</button>
          <button type="button" onClick={() => setBoardSize(5)} style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: boardSize === 5 ? (themeConfig[theme]?.primary || "#ffe066") : "none", color: boardSize === 5 ? (themeConfig[theme]?.buttonText || "#121214") : "inherit" }}>5x5 轻松</button>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div style={{ background: themeConfig[theme]?.bgCard || "#1e1e24", padding: "0.25rem 0.75rem", borderRadius: "4px", border: "1px solid var(--border-default)", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>SCORE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: themeConfig[theme]?.primary || "#ffe066" }}>{score}</div>
            </div>
            <div style={{ background: themeConfig[theme]?.bgCard || "#1e1e24", padding: "0.25rem 0.75rem", borderRadius: "4px", border: "1px solid var(--border-default)", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>BEST</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: themeConfig[theme]?.primary || "#ffe066" }}>{highScore}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              🔊 游戏音效
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={() => initGame(boardSize)}
              style={{
                padding: "0.4rem 1rem",
                background: themeConfig[theme]?.primary || "#ffe066",
                color: themeConfig[theme]?.buttonText || "#121214",
                fontWeight: "bold"
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      </div>

      {/* Grid Canvas Wrapper */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%", userSelect: "none" }}>
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "380px",
            background: themeConfig[theme]?.bgCard || "#1e1e24",
            border: `1.5px solid ${themeConfig[theme]?.primary}44` || "1.5px solid #2d2d30",
            borderRadius: "10px",
            padding: "10px",
            boxShadow: theme === "retro" ? "none" : `0 10px 25px ${themeConfig[theme]?.primary}0d`,
            boxSizing: "border-box"
          }}
        >
          {/* Main Grid Game board */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
              gap: "10px",
              width: "100%"
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((cellValue, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                const isNew = newTiles.includes(key);
                const isMerged = mergedTiles.includes(key);
                const tileStyle = cellValue > 0 ? getTileStyles(cellValue) : null;

                // Adjust text size based on value digits
                let fontSize = "1.8rem";
                if (cellValue >= 1024) fontSize = "1.2rem";
                else if (cellValue >= 100) fontSize = "1.45rem";

                if (boardSize === 5) {
                  fontSize = cellValue >= 1024 ? "1.05rem" : cellValue >= 100 ? "1.25rem" : "1.55rem";
                }

                return (
                  <div key={key} className="tile-cell" style={{ background: theme === "retro" ? "#1a1c1e" : "rgba(255, 255, 255, 0.05)" }}>
                    {cellValue > 0 && (
                      <div
                        className={`tile-active ${isNew ? "tile-new" : ""} ${isMerged ? "tile-merge" : ""}`}
                        style={{
                          backgroundColor: tileStyle?.bg,
                          color: tileStyle?.color,
                          boxShadow: tileStyle?.shadow,
                          border: theme === "retro" ? "2px solid #000" : "none",
                          fontSize: fontSize,
                          textShadow: cellValue > 4 ? "0 1px 2px rgba(0,0,0,0.15)" : "none"
                        }}
                      >
                        {cellValue}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: theme === "cyberpunk" ? "rgba(13, 0, 21, 0.9)" : "rgba(30, 30, 36, 0.9)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                animation: "popNew 0.3s ease"
              }}
            >
              <h3 style={{ fontSize: "2rem", fontWeight: "bold", color: "#ff6b6b", margin: "0 0 0.5rem 0" }}>游戏结束</h3>
              <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>最终得分: <strong style={{ color: themeConfig[theme]?.primary || "#ffe066" }}>{score}</strong> 分</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => initGame(boardSize)}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: themeConfig[theme]?.primary || "#ffe066",
                  color: themeConfig[theme]?.buttonText || "#121214",
                  fontWeight: "bold"
                }}
              >
                再试一次
              </button>
            </div>
          )}

          {/* Game Won Overlay */}
          {isWonOverlayActive && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: themeConfig[theme]?.primary || "#ffe066",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: themeConfig[theme]?.buttonText || "#121214",
                zIndex: 20,
                animation: "popNew 0.3s ease"
              }}
            >
              <h3 style={{ fontSize: "2.4rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>🎉 达成 2048 🎉</h3>
              <p style={{ fontWeight: "500", marginBottom: "1.5rem" }}>恭喜！你成功合成了 2048 砖块！</p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setKeepPlaying(true)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: themeConfig[theme]?.buttonText || "#121214",
                    color: themeConfig[theme]?.primary || "#ffe066",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  继续游玩
                </button>
                <button
                  type="button"
                  onClick={() => initGame(boardSize)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: "none",
                    border: `2px solid ${themeConfig[theme]?.buttonText || "#121214"}`,
                    color: themeConfig[theme]?.buttonText || "#121214",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: "1.5rem",
        padding: "1rem",
        background: themeConfig[theme]?.accentDim || "rgba(255, 224, 102, 0.05)",
        border: `1px dashed ${themeConfig[theme]?.primary}44` || "1px dashed rgba(255, 224, 102, 0.2)",
        borderRadius: "6px"
      }}>
        <p className="tool-note" style={{ margin: 0 }}>
          🎮 <strong>玩法窍门：</strong>尽量把最大的数字放在某一个固定角落（比如右下角），并使用单向控制（主要使用下、右操作，只在迫不得已时才向上滑动），这能防止棋盘方块错乱，更容易合成大数字！
        </p>
      </div>
    </section>
  );
}
