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

const numberColors = [
  "", // 0
  "#3b82f6", // 1 - Blue
  "#10b981", // 2 - Green
  "#ef4444", // 3 - Red
  "#8b5cf6", // 4 - Purple
  "#f59e0b", // 5 - Yellow/Orange
  "#06b6d4", // 6 - Cyan
  "#14b8a6", // 7 - Teal
  "#6b7280"  // 8 - Grey
];

export default function MinesweeperTool({ manifest }: ToolAppProps) {
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
    <section className="tool-panel">
      {/* Scoped shaking animation CSS block */}
      <style>{`
        .board-wrapper {
          display: inline-block;
          background: #1e1e24;
          border: 3px solid #2d2d30;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          overflow-x: auto;
          max-width: 100%;
        }

        .board-grid {
          display: grid;
          background: #2d2d30;
          gap: 2px;
          border: 2px solid #1e1e24;
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
          background: #3f3f46;
          border-top: 2.5px solid #52525b;
          border-left: 2.5px solid #52525b;
          border-bottom: 2.5px solid #27272a;
          border-right: 2.5px solid #27272a;
        }

        .cell-unrevealed:active {
          background: #333339;
          border: 1px solid #27272a;
        }

        .cell-revealed {
          background: #18181b;
          border: 1.5px solid #27272a;
        }

        .cell-exploded {
          background: #ef4444;
          border: 1px solid #dc2626;
          animation: pulseBlast 0.5s infinite;
        }

        @keyframes pulseBlast {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); background: #ff4d4f; }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="tool-panel__header" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">游戏娱乐工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>经典的 Windows 扫雷。鼠标左键翻开单元格，右键插旗标记雷，在翻开的数字单元格上“双击”可智能排开周围无雷区域。</p>
      </div>

      {/* Control bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>难度级别：</span>
          <button type="button" onClick={() => setDifficulty("easy")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: difficulty === "easy" ? "#ffe066" : "none", color: difficulty === "easy" ? "#121214" : "inherit" }}>初级 (9x9)</button>
          <button type="button" onClick={() => setDifficulty("medium")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: difficulty === "medium" ? "#ffe066" : "none", color: difficulty === "medium" ? "#121214" : "inherit" }}>中级 (16x16)</button>
          <button type="button" onClick={() => setDifficulty("hard")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: difficulty === "hard" ? "#ffe066" : "none", color: difficulty === "hard" ? "#121214" : "inherit" }}>高级 (30x16)</button>
          <button type="button" onClick={() => setDifficulty("custom")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: difficulty === "custom" ? "#ffe066" : "none", color: difficulty === "custom" ? "#121214" : "inherit" }}>自定义</button>
        </div>

        {/* Custom params fields */}
        {difficulty === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.5rem", background: "#1e1e24", border: "1px solid #2d2d30", borderRadius: "4px" }}>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "2px", alignItems: "center" }}>
              行数:
              <input type="number" min={8} max={30} value={customRows} onChange={(e) => handleCustomParamChange("rows", Number(e.target.value) || 8)} style={{ width: "45px", padding: "1px 4px", fontSize: "0.8rem" }} />
            </label>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "2px", alignItems: "center" }}>
              列数:
              <input type="number" min={8} max={35} value={customCols} onChange={(e) => handleCustomParamChange("cols", Number(e.target.value) || 8)} style={{ width: "45px", padding: "1px 4px", fontSize: "0.8rem" }} />
            </label>
            <label style={{ fontSize: "0.8rem", display: "flex", gap: "2px", alignItems: "center" }}>
              雷数:
              <input type="number" min={1} max={Math.floor(customRows*customCols*0.7)} value={customMines} onChange={(e) => handleCustomParamChange("mines", Number(e.target.value) || 1)} style={{ width: "45px", padding: "1px 4px", fontSize: "0.8rem" }} />
            </label>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            🔊 声音反馈
          </label>
          <button type="button" className="btn-primary" onClick={initBoard} style={{ padding: "0.4rem 1rem", background: "#ffe066", color: "#121214", fontWeight: "bold" }}>
            重新加载
          </button>
        </div>
      </div>

      {/* Main Game Interface Board */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div className="board-wrapper">
          {/* Header Panel inside retro-board (Flags Counter, Smile Face Reset, Timer) */}
          <div
            style={{
              background: "#121214",
              border: "1.5px solid #2d2d30",
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
            <div style={{ color: "#ff4d4f", fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "bold" }}>
              🚩 {String(Math.max(0, minesCount - flagsCount)).padStart(3, "0")}
            </div>

            {/* Restart face button */}
            <button
              type="button"
              onClick={initBoard}
              style={{
                fontSize: "1.3rem",
                width: "36px",
                height: "36px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#2d2d30",
                border: "2px solid #3f3f46",
                borderRadius: "50%",
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
              }}
            >
              {getSmileEmoji()}
            </button>

            {/* Timer Counter */}
            <div style={{ color: "#ffe066", fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "bold" }}>
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
                      inlineStyle.color = numberColors[cell.neighborMines];
                    }
                  }
                } else {
                  cellClass += "cell-unrevealed";
                  if (cell.isFlagged) {
                    display = "🚩";
                    inlineStyle.color = "#ff4d4f";
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
