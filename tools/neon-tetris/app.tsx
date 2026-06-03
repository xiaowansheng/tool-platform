"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// Tetromino Definitions: 0 = empty, 1 = filled
const TETROMINOES = {
  I: { matrix: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: "#00f0ff" },
  O: { matrix: [[1,1], [1,1]], color: "#fffb00" },
  T: { matrix: [[0,1,0], [1,1,1], [0,0,0]], color: "#a855f7" },
  S: { matrix: [[0,1,1], [1,1,0], [0,0,0]], color: "#a3e635" },
  Z: { matrix: [[1,1,0], [0,1,1], [0,0,0]], color: "#f43f5e" },
  J: { matrix: [[1,0,0], [1,1,1], [0,0,0]], color: "#3b82f6" },
  L: { matrix: [[0,0,1], [1,1,1], [0,0,0]], color: "#f97316" }
};

type TetrominoType = keyof typeof TETROMINOES;
const TETROMINO_KEYS: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

interface Piece {
  matrix: number[][];
  x: number;
  y: number;
  type: TetrominoType;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

const themeSkins = [
  { id: "cyberpunk", name: "赛博霓虹", bg: "#0d0015", card: "rgba(24, 0, 42, 0.8)", accent: "#00f0ff" },
  { id: "emerald", name: "翡翠之光", bg: "#06140d", card: "rgba(10, 30, 20, 0.8)", accent: "#10b981" },
  { id: "plasma", name: "等离子魔影", bg: "#080612", card: "rgba(15, 10, 30, 0.8)", accent: "#a855f7" },
  { id: "solar", name: "熔岩余晖", bg: "#1a0f0a", card: "rgba(40, 20, 10, 0.8)", accent: "#f97316" }
];

const COLS = 10;
const ROWS = 20;

function createEmptyGrid(): string[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

export default function NeonTetrisTool({ manifest }: ToolAppProps) {
  // Theme Skin State
  const [skin, setSkin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tetris_theme_skin") || "cyberpunk";
    }
    return "cyberpunk";
  });
  const activeSkin = themeSkins.find((s) => s.id === skin) || themeSkins[0];

  // Game Settings States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [enableGlow, setEnableGlow] = useState(true);

  // Core Game States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game board matrix: contains color string of filled cells, or empty string
  const gridRef = useRef<string[][]>(createEmptyGrid());

  // Piece structures
  const currentPieceRef = useRef<Piece | null>(null);
  const nextPiecesRef = useRef<TetrominoType[]>([]);
  const holdPieceRef = useRef<TetrominoType | null>(null);
  const canHoldRef = useRef<boolean>(true);

  // Particles
  const particlesRef = useRef<Particle[]>([]);

  // Screen shake variables
  const shakeTimeRef = useRef<number>(0);
  const shakeIntensityRef = useRef<number>(0);

  // Action timers
  const lastDropTimeRef = useRef<number>(0);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load High Score on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem("neon_tetris_high_score");
    if (savedHighScore) {
      setHighScore(Number(savedHighScore));
    }
  }, []);

  // Update Game Loop Timer
  useEffect(() => {
    if (!gameStarted || isGameOver || isPaused) return;

    let animFrameId: number;

    const gameTick = (time: number) => {
      if (!lastDropTimeRef.current) lastDropTimeRef.current = time;
      const elapsed = time - lastDropTimeRef.current;

      // Speed levels: level 1 = 800ms, level 2 = 720ms, level 3 = 630ms... Level 10+ = 100ms
      const dropInterval = Math.max(100, 800 - (level - 1) * 80);

      if (elapsed > dropInterval) {
        movePieceDown();
        lastDropTimeRef.current = time;
      }

      updateParticlesAndShake();
      drawGame();
      animFrameId = requestAnimationFrame(gameTick);
    };

    animFrameId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animFrameId);
  }, [gameStarted, isGameOver, isPaused, level]);

  // Handle key controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || isGameOver) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (isPaused) {
        if (e.key === " ") {
          e.preventDefault();
          setIsPaused(false);
          playTickSound(440);
        }
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          movePieceLeft();
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          movePieceRight();
          break;
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          rotatePiece();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          movePieceDown(true); // manual soft drop
          break;
        case "Space":
        case " ":
          e.preventDefault();
          hardDropPiece();
          break;
        case "Shift":
        case "c":
        case "C":
          e.preventDefault();
          holdPiece();
          break;
        case "Escape":
        case "p":
        case "P":
          e.preventDefault();
          setIsPaused(true);
          playTickSound(300);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, isGameOver, isPaused]);

  // Audio synthesis helper
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

  const playTickSound = (f = 600) => {
    playSound([f], [0.06], "sine");
  };

  const playMoveSound = () => {
    playSound([220], [0.04], "sine");
  };

  const playRotateSound = () => {
    playSound([330], [0.05], "triangle");
  };

  const playLockSound = () => {
    playSound([150], [0.1], "sine");
  };

  const playLineClearSound = (linesCount: number) => {
    if (linesCount === 4) {
      // Fanfare for Tetris
      playSound([523.25, 659.25, 783.99, 1046.50], [0.1, 0.1, 0.1, 0.3], "triangle");
    } else {
      // Normal line clear
      playSound([523.25, 783.99], [0.1, 0.2], "sine");
    }
  };

  const playCrashSound = () => {
    playSound([300, 150, 75], [0.15, 0.15, 0.4], "sawtooth");
  };

  // Generate random piece from standard bag
  const generateRandomPieceType = (): TetrominoType => {
    return TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
  };

  // Keep Next pieces array populated
  const refillNextPieces = () => {
    const queue = nextPiecesRef.current;
    while (queue.length < 4) {
      queue.push(generateRandomPieceType());
    }
  };

  // Spawn new active piece from queue
  const spawnPiece = () => {
    refillNextPieces();
    const type = nextPiecesRef.current.shift()!;
    const def = TETROMINOES[type];
    
    // Spawn at top center
    const newPiece: Piece = {
      matrix: def.matrix.map((row) => [...row]),
      x: Math.floor((COLS - def.matrix[0].length) / 2),
      y: 0,
      type,
      color: def.color
    };

    // Check collision on spawn (immediate game over)
    if (checkCollision(newPiece.matrix, newPiece.x, newPiece.y)) {
      handleGameOver();
      return;
    }

    currentPieceRef.current = newPiece;
    canHoldRef.current = true;
    refillNextPieces();
  };

  // Collision detection
  const checkCollision = (matrix: number[][], offsetCol: number, offsetRow: number): boolean => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const nextCol = offsetCol + c;
          const nextRow = offsetRow + r;

          // Out of bounds horizontally or bottom
          if (nextCol < 0 || nextCol >= COLS || nextRow >= ROWS) {
            return true;
          }

          // Collides with static grid blocks
          if (nextRow >= 0 && gridRef.current[nextRow][nextCol] !== "") {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Rotate piece matrix clockwise
  const rotatePiece = () => {
    const p = currentPieceRef.current;
    if (!p) return;

    const size = p.matrix.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));

    // Perform transpose and reverse rows
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        rotated[c][size - 1 - r] = p.matrix[r][c];
      }
    }

    // Basic wall kicks
    let kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!checkCollision(rotated, p.x + kick, p.y)) {
        p.matrix = rotated;
        p.x += kick;
        playRotateSound();
        return;
      }
    }
  };

  // Move left
  const movePieceLeft = () => {
    const p = currentPieceRef.current;
    if (!p) return;

    if (!checkCollision(p.matrix, p.x - 1, p.y)) {
      p.x -= 1;
      playMoveSound();
    }
  };

  // Move right
  const movePieceRight = () => {
    const p = currentPieceRef.current;
    if (!p) return;

    if (!checkCollision(p.matrix, p.x + 1, p.y)) {
      p.x += 1;
      playMoveSound();
    }
  };

  // Move down (gravity or soft drop)
  const movePieceDown = (isManual = false) => {
    const p = currentPieceRef.current;
    if (!p) return;

    if (!checkCollision(p.matrix, p.x, p.y + 1)) {
      p.y += 1;
      if (isManual) {
        setScore((s) => s + 1); // 1 point per soft drop row
        playMoveSound();
      }
    } else {
      // Lock piece and handle placement
      lockPiece();
    }
  };

  // Hard drop instantly
  const hardDropPiece = () => {
    const p = currentPieceRef.current;
    if (!p) return;

    let droppedRows = 0;
    while (!checkCollision(p.matrix, p.x, p.y + 1)) {
      p.y += 1;
      droppedRows++;
    }

    setScore((s) => s + droppedRows * 2); // 2 points per hard drop row
    playLockSound();
    triggerShake(5, 8);
    lockPiece();
  };

  // Lock piece into the playfield grid
  const lockPiece = () => {
    const p = currentPieceRef.current;
    if (!p) return;

    for (let r = 0; r < p.matrix.length; r++) {
      for (let c = 0; c < p.matrix[r].length; c++) {
        if (p.matrix[r][c] !== 0) {
          const gridR = p.y + r;
          const gridC = p.x + c;

          if (gridR >= 0 && gridR < ROWS) {
            gridRef.current[gridR][gridC] = p.color;
          }
        }
      }
    }

    // Check line clears
    checkLineClears();

    // Spawn next piece
    spawnPiece();
  };

  // Scan and clear full rows
  const checkLineClears = () => {
    const grid = gridRef.current;
    let linesCleared = 0;
    const clearedRows: number[] = [];

    for (let r = ROWS - 1; r >= 0; r--) {
      const isFull = grid[r].every((cell) => cell !== "");
      if (isFull) {
        linesCleared++;
        clearedRows.push(r);
      }
    }

    if (linesCleared > 0) {
      // Spawn line particles
      clearedRows.forEach((r) => {
        for (let c = 0; c < COLS; c++) {
          spawnRowClearParticle(c, r, grid[r][c]);
        }
      });

      // Animate cleared rows: collapse grid
      const nextGrid = grid.filter((_, idx) => !clearedRows.includes(idx));
      while (nextGrid.length < ROWS) {
        nextGrid.unshift(Array(COLS).fill(""));
      }

      gridRef.current = nextGrid;

      // Scoring: 100 for 1 line, 300 for 2 lines, 500 for 3 lines, 800 for 4 lines (Tetris)
      let pts = 0;
      switch (linesCleared) {
        case 1: pts = 100 * level; break;
        case 2: pts = 300 * level; break;
        case 3: pts = 500 * level; break;
        case 4: pts = 800 * level; break;
      }

      setScore((s) => {
        const nextScore = s + pts;
        if (nextScore > highScore) {
          setHighScore(nextScore);
          localStorage.setItem("neon_tetris_high_score", nextScore.toString());
        }
        return nextScore;
      });

      setLines((l) => {
        const nextLines = l + linesCleared;
        // Level up every 10 lines
        const nextLevel = Math.floor(nextLines / 10) + 1;
        if (nextLevel > level) {
          setLevel(nextLevel);
          playTickSound(1000); // sound pitch alert on level up
        }
        return nextLines;
      });

      playLineClearSound(linesCleared);
      triggerShake(linesCleared * 4, 12);
    }
  };

  // Hold piece swap
  const holdPiece = () => {
    if (!canHoldRef.current || !currentPieceRef.current) return;

    const currentType = currentPieceRef.current.type;
    const currentHold = holdPieceRef.current;

    holdPieceRef.current = currentType;

    if (currentHold === null) {
      // Generate new active piece
      spawnPiece();
    } else {
      // Swap active piece with hold piece
      const def = TETROMINOES[currentHold];
      currentPieceRef.current = {
        matrix: def.matrix.map((row) => [...row]),
        x: Math.floor((COLS - def.matrix[0].length) / 2),
        y: 0,
        type: currentHold,
        color: def.color
      };
    }

    canHoldRef.current = false;
    playTickSound(500);
  };

  // Get ghost piece shadow coordinates
  const getGhostY = (): number => {
    const p = currentPieceRef.current;
    if (!p) return 0;

    let ghostY = p.y;
    while (!checkCollision(p.matrix, p.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  };

  // Spawns line clearing blast particles
  const spawnRowClearParticle = (x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    const px = (x + 0.5) * cellW;
    const py = (y + 0.5) * cellH;

    // A few particles per cell
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        size: Math.random() * 2 + 2,
        alpha: 1,
        decay: Math.random() * 0.04 + 0.03
      });
    }
  };

  // Trigger screen shake
  const triggerShake = (intensity: number, duration: number) => {
    shakeTimeRef.current = duration;
    shakeIntensityRef.current = intensity;
  };

  // Handle Game Over
  const handleGameOver = () => {
    setIsGameOver(true);
    playCrashSound();
    triggerShake(15, 25);
    
    // Convert board to red blocks slowly or explode them
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (gridRef.current[r][c] !== "") {
          spawnRowClearParticle(c, r, "#ef4444");
        }
      }
    }
  };

  // Start the actual game
  const startGame = () => {
    gridRef.current = createEmptyGrid();
    nextPiecesRef.current = [];
    holdPieceRef.current = null;
    canHoldRef.current = true;
    particlesRef.current = [];
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(true);

    spawnPiece();
    playTickSound(800);
  };

  // Update particles and screen shake variables at 60fps
  const updateParticlesAndShake = () => {
    // Update particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  };

  // Draw board onto the Canvas
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Screen Shake if active
    if (shakeTimeRef.current > 0) {
      const dx = (Math.random() - 0.5) * shakeIntensityRef.current;
      const dy = (Math.random() - 0.5) * shakeIntensityRef.current;
      ctx.translate(dx, dy);
      shakeTimeRef.current--;
    }

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    // 1. Draw Grid Lines (Subtle)
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(canvas.width, i * cellH);
        ctx.stroke();
      }
    }

    // 2. Draw Static Blocks in the Playfield Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = gridRef.current[r][c];
        if (color !== "") {
          drawBlock(ctx, c, r, cellW, cellH, color, false);
        }
      }
    }

    // 3. Draw Ghost Piece Projection Shadow (if piece exists)
    const p = currentPieceRef.current;
    if (p && !isGameOver) {
      const ghostY = getGhostY();
      // Draw ghost matrix
      for (let r = 0; r < p.matrix.length; r++) {
        for (let c = 0; c < p.matrix[r].length; c++) {
          if (p.matrix[r][c] !== 0) {
            drawBlock(ctx, p.x + c, ghostY + r, cellW, cellH, p.color, true);
          }
        }
      }

      // 4. Draw Active Falling Piece
      for (let r = 0; r < p.matrix.length; r++) {
        for (let c = 0; c < p.matrix[r].length; c++) {
          if (p.matrix[r][c] !== 0) {
            drawBlock(ctx, p.x + c, p.y + r, cellW, cellH, p.color, false);
          }
        }
      }
    }

    // 5. Draw Particles
    ctx.shadowBlur = 0;
    const particles = particlesRef.current;
    for (const pt of particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  };

  // Draw individual block with neon styling
  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    isGhost = false
  ) => {
    if (y < 0) return; // Hide top buffer block

    const pad = 2;
    const bx = x * w + pad;
    const by = y * h + pad;
    const bw = w - pad * 2;
    const bh = h - pad * 2;

    if (isGhost) {
      // Hollow glowing outline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 4) : ctx.rect(bx, by, bw, bh);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    } else {
      // Solid block
      if (enableGlow) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 4) : ctx.fillRect(bx, by, bw, bh);
      ctx.fill();

      // Shiny inner core
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(bx + 3, by + 3, bw - 6, 3);
    }
  };

  // Preview mini boards for Next / Hold
  const drawPreviewGrid = (type: TetrominoType | null) => {
    if (!type) return <div style={{ width: "64px", height: "64px" }} />;
    
    const def = TETROMINOES[type];
    const matrix = def.color === "#fffb00" ? [[1,1],[1,1]] : def.matrix; // clean layout O

    return (
      <div style={{ display: "grid", gridTemplateRows: `repeat(${matrix.length}, 1fr)`, gap: "2px", width: "64px", height: "64px" }}>
        {matrix.map((row, rIdx) => (
          <div key={rIdx} style={{ display: "flex", gap: "2px", height: "100%" }}>
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                style={{
                  flex: 1,
                  borderRadius: "2px",
                  background: cell ? def.color : "transparent",
                  boxShadow: cell && enableGlow ? `0 0 6px ${def.color}` : "none",
                  border: cell ? "1px solid #ffffffaa" : "none"
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

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
        @keyframes neonPulse {
          0%, 100% { border-color: ${activeSkin.accent}; box-shadow: 0 0 8px ${activeSkin.accent}33; }
          50% { border-color: #ff007f; box-shadow: 0 0 20px #ff007fa1; }
        }
        .tetris-board-frame {
          border: 4px solid ${activeSkin.accent};
          animation: neonPulse 6s infinite;
          background: rgba(10, 5, 20, 0.95);
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
          max-width: 250px;
          aspect-ratio: 10/20;
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
          text-shadow: 0 0 4px rgba(255,255,255,0.5);
        }
        .tetris-mobile-btn {
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${activeSkin.accent}44;
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          user-select: none;
        }
        .tetris-mobile-btn:active {
          background: ${activeSkin.accent};
          color: ${activeSkin.bg};
          border-color: ${activeSkin.accent};
          box-shadow: 0 0 10px ${activeSkin.accent};
          transform: scale(0.92);
        }
      `}} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "460px" }}>
        {/* Header Title */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: activeSkin.accent, margin: 0, textShadow: `0 0 10px ${activeSkin.accent}88` }}>
              霓虹方块
            </h2>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0.25rem 0 0 0" }}>
              赛博经典俄罗斯方块
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {themeSkins.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSkin(s.id);
                  localStorage.setItem("tetris_theme_skin", s.id);
                  playTickSound();
                }}
                className={`btn-skin-selector ${skin === s.id ? "active" : ""}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Panels */}
        <div
          style={{
            background: activeSkin.card,
            border: `1px solid ${activeSkin.accent}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            textAlign: "center"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>当前积分</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: activeSkin.accent }}>
              {score}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>消除行数</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ff007f" }}>
              {lines}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>等级速度</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#a3e635" }}>
              Lvl {level}
            </span>
          </div>
        </div>

        {/* Tetris Board and Preview sidebars */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", width: "100%" }}>
          {/* Left panel (Hold) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "80px", alignItems: "center" }}>
            <div
              style={{
                width: "100%",
                background: activeSkin.card,
                border: `1px solid ${activeSkin.accent}22`,
                borderRadius: "8px",
                padding: "0.5rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "0.7rem", opacity: 0.6, marginBottom: "0.4rem" }}>暂存块</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "64px" }}>
                {drawPreviewGrid(holdPieceRef.current)}
              </div>
              <button
                type="button"
                onClick={holdPiece}
                style={{
                  marginTop: "0.4rem",
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.65rem",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${activeSkin.accent}55`,
                  color: "#ffffff",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                暂存 (Shift)
              </button>
            </div>
            <div
              style={{
                width: "100%",
                background: activeSkin.card,
                border: `1px solid ${activeSkin.accent}22`,
                borderRadius: "8px",
                padding: "0.5rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>最高纪录</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: activeSkin.accent, marginTop: "0.2rem" }}>
                {highScore}
              </div>
            </div>
          </div>

          {/* Core Arena */}
          <div className="tetris-board-frame relative" style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={250}
              height={500}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Game Cover Overlays */}
            {(!gameStarted || isGameOver) && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(10, 5, 20, 0.88)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1rem",
                  padding: "1rem",
                  textAlign: "center",
                  zIndex: 5
                }}
              >
                <h3 style={{
                  fontSize: isGameOver ? "1.8rem" : "1.6rem",
                  color: isGameOver ? "#ff007f" : activeSkin.accent,
                  fontWeight: "900",
                  margin: 0,
                  textShadow: `0 0 10px ${isGameOver ? "#ff007f" : activeSkin.accent}`
                }}>
                  {isGameOver ? "GAME OVER" : "NEON TETRIS"}
                </h3>

                {isGameOver && (
                  <p style={{ opacity: 0.8, fontSize: "0.85rem", margin: 0 }}>
                    本次得分：<strong style={{ color: activeSkin.accent }}>{score}</strong> 分
                  </p>
                )}

                <button
                  type="button"
                  onClick={startGame}
                  style={{
                    padding: "0.5rem 1.5rem",
                    background: activeSkin.accent,
                    color: activeSkin.bg,
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    borderRadius: "20px",
                    border: "none",
                    boxShadow: `0 0 12px ${activeSkin.accent}`,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {isGameOver ? "重新开始" : "开始游戏"}
                </button>

                <span style={{ fontSize: "0.65rem", opacity: 0.4 }}>
                  按【空格】或【回车】可快捷开始
                </span>
              </div>
            )}

            {/* Paused Overlay */}
            {isPaused && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(10, 5, 20, 0.75)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  zIndex: 5
                }}
              >
                <h3 style={{ fontSize: "1.8rem", color: activeSkin.accent, fontWeight: "900", textShadow: `0 0 10px ${activeSkin.accent}` }}>
                  PAUSED
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.3rem 1rem",
                    background: "transparent",
                    color: activeSkin.accent,
                    border: `2px solid ${activeSkin.accent}`,
                    fontWeight: "bold",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontSize: "0.8rem"
                  }}
                >
                  继续
                </button>
              </div>
            )}
          </div>

          {/* Right panel (Next) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "80px", alignItems: "center" }}>
            <div
              style={{
                width: "100%",
                background: activeSkin.card,
                border: `1px solid ${activeSkin.accent}22`,
                borderRadius: "8px",
                padding: "0.5rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "0.7rem", opacity: 0.6, marginBottom: "0.4rem" }}>下一个</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "64px" }}>
                {drawPreviewGrid(nextPiecesRef.current[0] || null)}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                background: activeSkin.card,
                border: `1px solid ${activeSkin.accent}22`,
                borderRadius: "8px",
                padding: "0.5rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "0.7rem", opacity: 0.6, marginBottom: "0.4rem" }}>下下一个</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "64px" }}>
                {drawPreviewGrid(nextPiecesRef.current[1] || null)}
              </div>
            </div>
          </div>
        </div>

        {/* Game Settings */}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>画面特效</span>
              <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  onClick={() => {
                    setShowGrid(!showGrid);
                    playTickSound();
                  }}
                  style={{
                    flex: 1,
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    background: showGrid ? `${activeSkin.accent}22` : "transparent",
                    color: showGrid ? activeSkin.accent : "#888888",
                    cursor: "pointer",
                    border: "none"
                  }}
                >
                  网格: {showGrid ? "显" : "隐"}
                </button>
                <button
                  onClick={() => {
                    setEnableGlow(!enableGlow);
                    playTickSound();
                  }}
                  style={{
                    flex: 1,
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    background: enableGlow ? `${activeSkin.accent}22` : "transparent",
                    color: enableGlow ? activeSkin.accent : "#888888",
                    cursor: "pointer",
                    border: "none"
                  }}
                >
                  光晕: {enableGlow ? "开" : "关"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>声音开关</span>
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  playTickSound();
                }}
                style={{
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: `1px solid ${soundEnabled ? activeSkin.accent : "rgba(255,255,255,0.15)"}`,
                  background: soundEnabled ? `${activeSkin.accent}15` : "transparent",
                  color: soundEnabled ? activeSkin.accent : "#ffffff",
                  cursor: "pointer",
                  fontWeight: "bold",
                  height: "100%",
                  transition: "all 0.15s ease"
                }}
              >
                街机合成音效: {soundEnabled ? "启用" : "静音"}
              </button>
            </div>
          </div>

          {gameStarted && !isGameOver && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", opacity: 0.75, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
              <span>按【Esc】键暂停</span>
              <button
                onClick={() => setIsPaused((p) => !p)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: activeSkin.accent,
                  cursor: "pointer"
                }}
              >
                {isPaused ? "继续" : "点击暂停"}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Control Panel (Virtual D-pad) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }} className="md:hidden">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => { rotatePiece(); }} className="tetris-mobile-btn">旋转</button>
            <button onClick={() => { holdPiece(); }} className="tetris-mobile-btn">暂存</button>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button onClick={() => { movePieceLeft(); }} className="tetris-mobile-btn">◀</button>
            <button onClick={() => { movePieceDown(true); }} className="tetris-mobile-btn">▼</button>
            <button onClick={() => { movePieceRight(); }} className="tetris-mobile-btn">▶</button>
          </div>
          <button onClick={() => { hardDropPiece(); }} className="tetris-mobile-btn" style={{ width: "120px", borderRadius: "10px" }}>瞬降 Space</button>
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
          🎮 <strong>操作方法与技巧：</strong>
          <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.2rem" }}>
            <li>在电脑上，使用键盘的<strong>左右方向键 (← →)</strong> 或 <strong>A D</strong> 移动方块。</li>
            <li>按<strong>上方向键 (↑)</strong> 或 <strong>W</strong> 旋转方块；按<strong>下方向键 (↓)</strong> 或 <strong>S</strong> 软下落。</li>
            <li>按<strong>空格键 (Space)</strong> 瞬间下落到底部并锁定；按<strong>Shift</strong> 或 <strong>C</strong> 暂存当前方块。</li>
            <li><strong>预测阴影 (Ghost)</strong> 能直接向你展示方块落下的准确映射位置，帮你更快更准确做出决策。</li>
            <li>每消除 10 行将自动增加 1 个等级速度，获取消行分数倍增，快来挑战自己的手速极限吧！</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
