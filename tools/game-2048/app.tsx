"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function Game2048Tool({ manifest }: ToolAppProps) {
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
    const merged: boolean[] = Array(size).fill(false);

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

    // Map the new/merged indices back to original positions for animations
    // (For simplicity we just apply pop animations to the newly resolved spots)
    
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

  // Colors based on Tile Value
  const getTileStyles = (value: number) => {
    const styleMap: Record<number, { bg: string; color: string; shadow?: string }> = {
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

    if (value > 2048) {
      return {
        bg: "#3c3a32",
        color: "#f9f6f2",
        shadow: "0 0 36px rgba(0, 0, 0, 0.4)"
      };
    }

    return styleMap[value] || { bg: "#3f3f46", color: "#e4e4e7" };
  };

  return (
    <section className="tool-panel">
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
      `}</style>

      <div className="tool-panel__header" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">游戏娱乐工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>通过合并相同的数字方块来合成 2048。支持使用电脑方向键 (↑↓←→ / WASD) 或在手机屏幕上划动进行操作。</p>
      </div>

      {/* Control bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>棋盘规格：</span>
          <button type="button" onClick={() => setBoardSize(3)} style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: boardSize === 3 ? "#ffe066" : "none", color: boardSize === 3 ? "#121214" : "inherit" }}>3x3 极速</button>
          <button type="button" onClick={() => setBoardSize(4)} style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: boardSize === 4 ? "#ffe066" : "none", color: boardSize === 4 ? "#121214" : "inherit" }}>4x4 经典</button>
          <button type="button" onClick={() => setBoardSize(5)} style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: boardSize === 5 ? "#ffe066" : "none", color: boardSize === 5 ? "#121214" : "inherit" }}>5x5 轻松</button>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div style={{ background: "#1e1e24", padding: "0.25rem 0.75rem", borderRadius: "4px", border: "1px solid #2d2d30", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>SCORE</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#ffe066" }}>{score}</div>
            </div>
            <div style={{ background: "#1e1e24", padding: "0.25rem 0.75rem", borderRadius: "4px", border: "1px solid #2d2d30", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>BEST</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#ffe066" }}>{highScore}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              🔊 游戏音效
            </label>
            <button type="button" className="btn-primary" onClick={() => initGame(boardSize)} style={{ padding: "0.4rem 1rem", background: "#ffe066", color: "#121214", fontWeight: "bold" }}>
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
            background: "#1e1e24",
            border: "1.5px solid #2d2d30",
            borderRadius: "10px",
            padding: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
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
                  <div key={key} className="tile-cell">
                    {cellValue > 0 && (
                      <div
                        className={`tile-active ${isNew ? "tile-new" : ""} ${isMerged ? "tile-merge" : ""}`}
                        style={{
                          backgroundColor: tileStyle?.bg,
                          color: tileStyle?.color,
                          boxShadow: tileStyle?.shadow,
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
                background: "rgba(30, 30, 36, 0.9)",
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
              <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>最终得分: <strong style={{ color: "#ffe066" }}>{score}</strong> 分</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => initGame(boardSize)}
                style={{ padding: "0.5rem 1.5rem", background: "#ffe066", color: "#121214", fontWeight: "bold" }}
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
                background: "rgba(255, 224, 102, 0.95)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#121214",
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
                  style={{ padding: "0.5rem 1.25rem", background: "#121214", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold" }}
                >
                  继续游玩
                </button>
                <button
                  type="button"
                  onClick={() => initGame(boardSize)}
                  style={{ padding: "0.5rem 1.25rem", background: "none", border: "2px solid #121214", color: "#121214", borderRadius: "4px", fontWeight: "bold" }}
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(255, 224, 102, 0.05)", border: "1px dashed rgba(255, 224, 102, 0.2)", borderRadius: "6px" }}>
        <p className="tool-note" style={{ margin: 0 }}>
          🎮 <strong>玩法窍门：</strong>尽量把最大的数字放在某一个固定角落（比如右下角），并使用单向控制（主要使用下、右操作，只在迫不得已时才向上滑动），这能防止棋盘方块错乱，更容易合成大数字！
        </p>
      </div>
    </section>
  );
}
