"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

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
  { id: "cyberpunk", name: "赛博霓虹", snake: "#00f0ff", food: "#ff007f", obstacle: "#fffb00", bg: "#0d0015", card: "rgba(24, 0, 42, 0.8)", shadow: "#00f0ff" },
  { id: "emerald", name: "翡翠之光", snake: "#10b981", food: "#facc15", obstacle: "#ef4444", bg: "#06140d", card: "rgba(10, 30, 20, 0.8)", shadow: "#10b981" },
  { id: "plasma", name: "等离子魔影", snake: "#a855f7", food: "#22d3ee", obstacle: "#f43f5e", bg: "#080612", card: "rgba(15, 10, 30, 0.8)", shadow: "#a855f7" },
  { id: "solar", name: "熔岩余晖", snake: "#f97316", food: "#a3e635", obstacle: "#3b82f6", bg: "#1a0f0a", card: "rgba(40, 20, 10, 0.8)", shadow: "#f97316" }
];

export default function NeonSnakeTool({ manifest }: ToolAppProps) {
  // Theme Skin State
  const [skin, setSkin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("snake_theme_skin") || "cyberpunk";
    }
    return "cyberpunk";
  });
  const activeSkin = themeSkins.find((s) => s.id === skin) || themeSkins[0];

  // Game Settings States
  const [speedLevel, setSpeedLevel] = useState<"easy" | "medium" | "hard">("medium");
  const [obstacleMode, setObstacleMode] = useState(false);
  const [wrapMode, setWrapMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [enableGlow, setEnableGlow] = useState(true);

  // Score states
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Canvas details
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const GRID_SIZE = 20; // 20x20 grid

  // Game loop refs to keep state between renders
  const snakeRef = useRef<{ x: number; y: number }[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const directionRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  const directionQueueRef = useRef<{ x: number; y: number }[]>([]);
  const foodRef = useRef<{ x: number; y: number }>({ x: 15, y: 10 });
  const obstaclesRef = useRef<{ x: number; y: number }[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Screen shake animation variables
  const shakeTimeRef = useRef<number>(0);
  const shakeIntensityRef = useRef<number>(0);

  // Mobile Touch Swipe references
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load High Score on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem("neon_snake_high_score");
    if (savedHighScore) {
      setHighScore(Number(savedHighScore));
    }
  }, []);

  // Update speed level settings (ms per step)
  const getSpeedMs = () => {
    switch (speedLevel) {
      case "easy": return 140;
      case "hard": return 60;
      case "medium":
      default: return 95;
    }
  };

  // Keyboard controls listener with direction queue & instant start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent | any) => {
      // Game start or restart triggers
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

      // Handle game direction changes
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          requestDirectionChange({ x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          requestDirectionChange({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          requestDirectionChange({ x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          requestDirectionChange({ x: 1, y: 0 });
          break;
        case " ":
          e.preventDefault();
          setIsPaused(true);
          playTickSound(350);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, isGameOver, isPaused]);

  // Handle Game Update Tick Loop
  useEffect(() => {
    if (!gameStarted || isGameOver || isPaused) return;

    const interval = setInterval(() => {
      updateGame();
    }, getSpeedMs());

    return () => clearInterval(interval);
  }, [gameStarted, isGameOver, isPaused, speedLevel, obstacleMode, wrapMode]);

  // Handle Canvas Animation Render Loop (Runs at 60fps for particles and screen shake)
  useEffect(() => {
    let animationId: number;

    const render = () => {
      drawGame();
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [skin, gameStarted, isGameOver, isPaused, score, showGrid, enableGlow]);

  // Push new direction to the input buffer
  const requestDirectionChange = (newDir: { x: number; y: number }) => {
    const queue = directionQueueRef.current;
    
    // Compare with the last queued direction, or current direction if queue is empty
    const lastProposedDir = queue.length > 0 ? queue[queue.length - 1] : directionRef.current;

    // Reject 180 degree instant suicide turns
    if (newDir.x === -lastProposedDir.x && newDir.y === -lastProposedDir.y) {
      return;
    }
    
    // Ignore duplicate direction clicks
    if (newDir.x === lastProposedDir.x && newDir.y === lastProposedDir.y) {
      return;
    }

    // Limit buffer queue to 2 inputs to maintain responsive controls without delay buildup
    if (queue.length < 2) {
      queue.push(newDir);
    }
  };

  // Audio synthesis helpers
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

  const playEatSound = () => {
    playSound([523.25, 783.99, 1046.50], [0.08, 0.08, 0.15], "triangle");
  };

  const playCrashSound = () => {
    playSound([300, 150, 75], [0.15, 0.15, 0.3], "sawtooth");
  };

  // Generate random coordinate not on snake or obstacles
  const generateRandomFood = () => {
    let position: { x: number; y: number } | null = null;
    let attempts = 0;

    while (!position && attempts < 200) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);

      const onSnake = snakeRef.current.some((part) => part.x === x && part.y === y);
      const onObstacle = obstaclesRef.current.some((obs) => obs.x === x && obs.y === y);

      if (!onSnake && !onObstacle) {
        position = { x, y };
      }
      attempts++;
    }

    foodRef.current = position || { x: 5, y: 5 };
  };

  // Generate obstacles based on GRID_SIZE
  const generateObstacles = () => {
    if (!obstacleMode) {
      obstaclesRef.current = [];
      return;
    }

    const obs: { x: number; y: number }[] = [];
    const wallCount = 4;
    for (let w = 0; w < wallCount; w++) {
      const isHorizontal = Math.random() > 0.5;
      const startX = Math.floor(Math.random() * (GRID_SIZE - 6)) + 3;
      const startY = Math.floor(Math.random() * (GRID_SIZE - 6)) + 3;
      const length = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < length; i++) {
        const x = startX + (isHorizontal ? i : 0);
        const y = startY + (isHorizontal ? 0 : i);

        // Keep center clean
        if (Math.abs(x - 10) > 3 || Math.abs(y - 10) > 3) {
          obs.push({ x, y });
        }
      }
    }
    obstaclesRef.current = obs;
  };

  // Spawns explosion particles
  const spawnExplosion = (x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellW = canvas.width / GRID_SIZE;
    const cellH = canvas.height / GRID_SIZE;

    const px = (x + 0.5) * cellW;
    const py = (y + 0.5) * cellH;

    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 3 + 2;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  };

  // Trigger screen shake
  const triggerShake = (intensity = 8, duration = 15) => {
    shakeTimeRef.current = duration;
    shakeIntensityRef.current = intensity;
  };

  // Start the actual game
  const startGame = () => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    directionRef.current = { x: 1, y: 0 };
    directionQueueRef.current = [];
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    generateObstacles();
    generateRandomFood();
    particlesRef.current = [];
    setGameStarted(true);
    playTickSound(800);
  };

  // Update Game Logic on ticks pulling direction from queue buffer
  const updateGame = () => {
    const snake = [...snakeRef.current];
    
    // Pull the next direction out of the buffer if available
    let nextDir = directionRef.current;
    if (directionQueueRef.current.length > 0) {
      const proposedDir = directionQueueRef.current.shift()!;
      // Final sanity check that it isn't opposite to directionRef.current
      if (proposedDir.x !== -directionRef.current.x || proposedDir.y !== -directionRef.current.y) {
        nextDir = proposedDir;
      }
    }
    directionRef.current = nextDir;

    // Calculate next head position
    let nextHead = {
      x: snake[0].x + nextDir.x,
      y: snake[0].y + nextDir.y
    };

    // Boundary wrap logic or die logic
    if (wrapMode) {
      nextHead.x = (nextHead.x + GRID_SIZE) % GRID_SIZE;
      nextHead.y = (nextHead.y + GRID_SIZE) % GRID_SIZE;
    } else {
      if (nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE) {
        handleGameOver();
        return;
      }
    }

    // Collision with self
    const collidedSelf = snake.some((part) => part.x === nextHead.x && part.y === nextHead.y);
    if (collidedSelf) {
      handleGameOver();
      return;
    }

    // Collision with obstacles
    const collidedObstacle = obstaclesRef.current.some((obs) => obs.x === nextHead.x && obs.y === nextHead.y);
    if (collidedObstacle) {
      handleGameOver();
      return;
    }

    // Add new head
    snake.unshift(nextHead);

    // Collision with food
    const eaten = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
    if (eaten) {
      setScore((s) => {
        const nextScore = s + 10;
        if (nextScore > highScore) {
          setHighScore(nextScore);
          localStorage.setItem("neon_snake_high_score", nextScore.toString());
        }
        return nextScore;
      });
      playEatSound();
      spawnExplosion(foodRef.current.x, foodRef.current.y, activeSkin.food);
      generateRandomFood();
    } else {
      snake.pop(); // Remove tail
    }

    snakeRef.current = snake;
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    playCrashSound();
    triggerShake(12, 20);

    if (snakeRef.current.length > 0) {
      spawnExplosion(snakeRef.current[0].x, snakeRef.current[0].y, activeSkin.snake);
    }
  };

  // Touch handlers for responsive finger swipes
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;
    // Prevent screen dragging/scrolling when playing
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    
    const threshold = 35; // Swipe distance in pixels
    if (Math.max(Math.abs(dx), Math.abs(dy)) > threshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipes
        if (dx > 0) {
          requestDirectionChange({ x: 1, y: 0 });
        } else {
          requestDirectionChange({ x: -1, y: 0 });
        }
      } else {
        // Vertical swipes
        if (dy > 0) {
          requestDirectionChange({ x: 0, y: 1 });
        } else {
          requestDirectionChange({ x: 0, y: -1 });
        }
      }
    }
    
    touchStartRef.current = null;
  };

  // Draw Game Canvas Board
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset transform before clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Screen Shake if active
    if (shakeTimeRef.current > 0) {
      const dx = (Math.random() - 0.5) * shakeIntensityRef.current;
      const dy = (Math.random() - 0.5) * shakeIntensityRef.current;
      ctx.translate(dx, dy);
      shakeTimeRef.current--;
    }

    const cellW = canvas.width / GRID_SIZE;
    const cellH = canvas.height / GRID_SIZE;

    // 1. Draw Grid Lines (Conditional)
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(canvas.width, i * cellH);
        ctx.stroke();
      }
    }

    // 2. Draw Obstacles (Glow style conditional)
    if (enableGlow) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = activeSkin.obstacle;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = activeSkin.obstacle;
    obstaclesRef.current.forEach((obs) => {
      ctx.fillRect(obs.x * cellW + 1, obs.y * cellH + 1, cellW - 2, cellH - 2);
    });

    // 3. Draw Food (Glow Pulse style)
    const pulseFactor = 1 + Math.sin(Date.now() * 0.01) * 0.15;
    if (enableGlow) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = activeSkin.food;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = activeSkin.food;
    ctx.beginPath();
    ctx.arc(
      (foodRef.current.x + 0.5) * cellW,
      (foodRef.current.y + 0.5) * cellH,
      ((cellW - 4) / 2) * pulseFactor,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 4. Draw Snake
    if (enableGlow) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = activeSkin.snake;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = activeSkin.snake;

    const snake = snakeRef.current;
    snake.forEach((part, index) => {
      // Outer neon skin
      ctx.fillStyle = activeSkin.snake;
      ctx.fillRect(part.x * cellW + 1, part.y * cellH + 1, cellW - 2, cellH - 2);

      // Inner glow stripe
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(part.x * cellW + 5, part.y * cellH + 5, cellW - 10, cellH - 10);
    });

    // 5. Draw and update particles
    ctx.shadowBlur = 0; // Turn off glow for performance on small items
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0; // Restore alpha
  };

  // Virtual controller actions for mobile users (now redirects to buffered request)
  const handleVirtualDir = (dir: { x: number; y: number }) => {
    if (!gameStarted || isGameOver || isPaused) return;
    requestDirectionChange(dir);
    playTickSound(500);
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
          0%, 100% { border-color: ${activeSkin.snake}; box-shadow: 0 0 10px ${activeSkin.snake}55; }
          50% { border-color: ${activeSkin.food}; box-shadow: 0 0 25px ${activeSkin.food}aa; }
        }
        .snake-board-frame {
          border: 4px solid ${activeSkin.snake};
          animation: neonPulse 6s infinite;
          background: rgba(10, 5, 20, 0.9);
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
          max-width: 440px;
          aspect-ratio: 1;
          touch-action: none; /* Prevents default browser scrolling on touch drag */
        }
        .btn-skin-selector {
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 4px;
          border: 1px solid ${activeSkin.snake}44;
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-skin-selector.active {
          background: ${activeSkin.snake};
          color: ${activeSkin.bg};
          border-color: ${activeSkin.snake};
          font-weight: bold;
          text-shadow: 0 0 4px rgba(255,255,255,0.5);
        }
        .mobile-dpad-btn {
          width: 54px;
          height: 54px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${activeSkin.snake}44;
          color: #ffffff;
          font-size: 1.3rem;
          font-weight: bold;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .mobile-dpad-btn:active {
          background: ${activeSkin.snake};
          color: ${activeSkin.bg};
          border-color: ${activeSkin.snake};
          box-shadow: 0 0 15px ${activeSkin.snake};
          transform: scale(0.9);
        }
      `}} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "460px" }}>
        {/* Header Title */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: activeSkin.snake, margin: 0, textShadow: `0 0 10px ${activeSkin.snake}88` }}>
              霓虹贪吃蛇
            </h2>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0.25rem 0 0 0" }}>
              赛博朋克电子街机风格
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {themeSkins.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSkin(s.id);
                  localStorage.setItem("snake_theme_skin", s.id);
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
            border: `1px solid ${activeSkin.snake}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>当前积分</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "800", color: activeSkin.food }}>
              {score}
            </span>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>最高分</span>
              <span style={{ fontSize: "1.4rem", fontWeight: "800", color: activeSkin.snake }}>
                {highScore}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Snake Arena with Swipe Events */}
        <div className="snake-board-frame relative" style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }}
          />

          {/* Game Over / Not started cover screens */}
          {(!gameStarted || isGameOver) && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(10, 5, 20, 0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                padding: "2rem",
                textAlign: "center"
              }}
            >
              <h3 style={{
                fontSize: isGameOver ? "2.2rem" : "1.8rem",
                color: isGameOver ? activeSkin.food : activeSkin.snake,
                fontWeight: "900",
                margin: 0,
                textShadow: `0 0 15px ${isGameOver ? activeSkin.food : activeSkin.snake}`
              }}>
                {isGameOver ? "GAME OVER" : "NEON SNAKE"}
              </h3>

              {isGameOver && (
                <p style={{ opacity: 0.8, fontSize: "0.95rem" }}>
                  本次得分：<strong style={{ color: activeSkin.food, fontSize: "1.2rem" }}>{score}</strong> 分
                </p>
              )}

              <button
                type="button"
                onClick={startGame}
                style={{
                  padding: "0.6rem 2rem",
                  background: activeSkin.snake,
                  color: activeSkin.bg,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  borderRadius: "24px",
                  border: "none",
                  boxShadow: `0 0 15px ${activeSkin.snake}`,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {isGameOver ? "重新开始" : "开始游戏"}
              </button>

              <span style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "0.5rem" }}>
                提示: 按【空格键】或【回车键】可快捷开始
              </span>
            </div>
          )}

          {/* Paused Screen */}
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
                gap: "0.5rem"
              }}
            >
              <h3 style={{ fontSize: "2rem", color: activeSkin.snake, fontWeight: "900", textShadow: `0 0 10px ${activeSkin.snake}` }}>
                PAUSED
              </h3>
              <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>按下空格键或点击下方继续</p>
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.4rem 1.2rem",
                  background: "transparent",
                  color: activeSkin.snake,
                  border: `2px solid ${activeSkin.snake}`,
                  fontWeight: "bold",
                  borderRadius: "16px",
                  cursor: "pointer"
                }}
              >
                继续
              </button>
            </div>
          )}
        </div>

        {/* Game Mode Settings */}
        <div
          style={{
            background: activeSkin.card,
            border: `1px solid ${activeSkin.snake}22`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Speed toggle */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>难度速度</span>
              <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                {(["easy", "medium", "hard"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setSpeedLevel(lvl);
                      playTickSound();
                    }}
                    style={{
                      flex: 1,
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      background: speedLevel === lvl ? activeSkin.snake : "transparent",
                      color: speedLevel === lvl ? activeSkin.bg : "#ffffff",
                      fontWeight: speedLevel === lvl ? "bold" : "normal",
                      cursor: "pointer",
                      border: "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {lvl === "easy" ? "慢速" : lvl === "hard" ? "极速" : "常速"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode switch */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>边缘物理</span>
              <button
                onClick={() => {
                  setWrapMode((w) => !w);
                  playTickSound();
                }}
                style={{
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: `1px solid ${activeSkin.snake}55`,
                  background: wrapMode ? `${activeSkin.snake}15` : "transparent",
                  color: wrapMode ? activeSkin.snake : "#ffffff",
                  cursor: "pointer",
                  fontWeight: "bold",
                  textAlign: "center",
                  height: "100%",
                  transition: "all 0.15s ease"
                }}
              >
                {wrapMode ? "穿墙（自由）" : "撞墙（致死）"}
              </button>
            </div>
          </div>

          {/* Toggle Switches in a clean row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.8rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>障碍物地图</span>
              <button
                onClick={() => {
                  setObstacleMode((o) => !o);
                  playTickSound();
                  if (!isGameOver) handleGameOver(); // Auto restart
                }}
                style={{
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: `1px solid ${obstacleMode ? activeSkin.obstacle : "rgba(255,255,255,0.15)"}`,
                  background: obstacleMode ? `${activeSkin.obstacle}15` : "transparent",
                  color: obstacleMode ? activeSkin.obstacle : "#888888",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.15s ease"
                }}
              >
                {obstacleMode ? "障碍物已启用" : "标准空地图"}
              </button>
            </div>

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
                    background: showGrid ? `${activeSkin.snake}22` : "transparent",
                    color: showGrid ? activeSkin.snake : "#888888",
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
                    background: enableGlow ? `${activeSkin.snake}22` : "transparent",
                    color: enableGlow ? activeSkin.snake : "#888888",
                    cursor: "pointer",
                    border: "none"
                  }}
                >
                  光晕: {enableGlow ? "开" : "关"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", opacity: 0.75, marginTop: "0.25rem" }}>
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
              启用街机合成音效
            </label>

            {gameStarted && !isGameOver && (
              <button
                onClick={() => setIsPaused((p) => !p)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: activeSkin.snake,
                  cursor: "pointer"
                }}
              >
                {isPaused ? "继续游玩" : "暂停 (空格键)"}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Control Panel (Virtual D-pad) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            onClick={() => handleVirtualDir({ x: 0, y: -1 })}
            className="mobile-dpad-btn"
          >
            ▲
          </button>
          <div style={{ display: "flex", gap: "2.5rem" }}>
            <button
              onClick={() => handleVirtualDir({ x: -1, y: 0 })}
              className="mobile-dpad-btn"
            >
              ◀
            </button>
            <button
              onClick={() => handleVirtualDir({ x: 1, y: 0 })}
              className="mobile-dpad-btn"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => handleVirtualDir({ x: 0, y: 1 })}
            className="mobile-dpad-btn"
          >
            ▼
          </button>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: "1rem",
            background: `${activeSkin.snake}11`,
            border: `1px dashed ${activeSkin.snake}44`,
            borderRadius: "6px",
            fontSize: "0.85rem",
            lineHeight: "1.4"
          }}
        >
          🎮 <strong>操作方法与技巧：</strong>
          <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.2rem" }}>
            <li>在电脑上使用 <strong>方向键</strong> 或 <strong>W A S D</strong> 进行精确转向控制，<strong>空格键</strong> 暂停。</li>
            <li>在手机或平板电脑上，您可以直接在游戏画布上<strong>上下左右滑动手指（Swipe）</strong>来操作蛇的朝向，操控更加自然！</li>
            <li><strong>输入转向缓冲技术</strong>：支持在一条蛇移动步长内连续输入两个转弯命令，完美防止转弯延迟或按错自我碰撞！</li>
            <li>低性能设备可以关闭<strong>光晕特效</strong>来换取极限流畅的 60FPS 帧率体验。</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
