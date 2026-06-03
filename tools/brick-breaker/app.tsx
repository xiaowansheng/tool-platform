"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// ----------------------------------------------------------------------
// Audio Synthesizer for Retro/Neon Sound Effects
// ----------------------------------------------------------------------
class SoundSynth {
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

  private playTone(freqs: number[], duration: number, type: OscillatorType = "sine", volume = 0.1) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      // Simple frequency envelope
      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else if (freqs.length > 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
        const step = duration / (freqs.length - 1);
        for (let i = 1; i < freqs.length; i++) {
          osc.frequency.exponentialRampToValueAtTime(freqs[i], now + i * step);
        }
      }

      // Volume envelope
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio context might be blocked or inactive
    }
  }

  playWall() {
    this.playTone([120, 80], 0.08, "triangle", 0.15);
  }

  playPaddle() {
    this.playTone([200, 320], 0.1, "sine", 0.2);
  }

  playBrick() {
    this.playTone([400, 600], 0.08, "triangle", 0.12);
  }

  playHardBrick() {
    // Metal metallic clank
    this.playTone([600, 900], 0.12, "sawtooth", 0.08);
  }

  playExplosion() {
    this.playTone([180, 40], 0.35, "sawtooth", 0.25);
  }

  playPowerup() {
    // Arpeggio
    this.playTone([261.6, 329.6, 392.0, 523.3], 0.25, "sine", 0.15);
  }

  playVictory() {
    this.playTone([261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5], 0.6, "sine", 0.15);
  }

  playGameover() {
    this.playTone([392.0, 349.2, 311.1, 261.6, 196.0], 0.8, "sawtooth", 0.15);
  }
}

const synth = new SoundSynth();

// ----------------------------------------------------------------------
// Game Definitions & Types
// ----------------------------------------------------------------------
interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  speed: number;
  trail: { x: number; y: number }[];
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "normal" | "hard" | "bomb" | "teleport";
  color: string;
  hp: number;
  maxHp: number;
  score: number;
  visible: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "split" | "enlarge" | "sticky" | "laser" | "shield";
  color: string;
  label: string;
}

interface Laser {
  x: number;
  y: number;
  vy: number;
}

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 600;

// Level brick configurations
const createLevelBricks = (level: number): Brick[] => {
  const bricks: Brick[] = [];
  const cols = 10;
  const brickWidth = 70;
  const brickHeight = 24;
  const startX = (LOGICAL_WIDTH - (cols * brickWidth + (cols - 1) * 8)) / 2;
  const startY = 60;

  if (level === 1) {
    // Rainbow classic - 5 rows, regular bricks
    const colors = ["#ff3366", "#ff9933", "#33cc66", "#3399ff", "#b366ff"];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: startX + c * (brickWidth + 8),
          y: startY + r * (brickHeight + 8),
          width: brickWidth,
          height: brickHeight,
          type: "normal",
          color: colors[r],
          hp: 1,
          maxHp: 1,
          score: 100,
          visible: true,
        });
      }
    }
  } else if (level === 2) {
    // Space Fortress - alternating hard bricks & gap structures
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < cols; c++) {
        // Leave some gaps
        if ((r === 1 || r === 3) && (c === 2 || c === 3 || c === 6 || c === 7)) continue;

        const isHard = (r === 0 && (c === 0 || c === 4 || c === 5 || c === 9)) || (r === 2 && (c === 2 || c === 7));
        bricks.push({
          x: startX + c * (brickWidth + 8),
          y: startY + r * (brickHeight + 8),
          width: brickWidth,
          height: brickHeight,
          type: isHard ? "hard" : "normal",
          color: isHard ? "#a1a1aa" : r % 2 === 0 ? "#00f0ff" : "#ff007f",
          hp: isHard ? 3 : 1,
          maxHp: isHard ? 3 : 1,
          score: isHard ? 300 : 150,
          visible: true,
        });
      }
    }
  } else if (level === 3) {
    // Heart Shape Neon Grid
    const heartPattern = [
      [0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
    ];
    for (let r = 0; r < heartPattern.length; r++) {
      for (let c = 0; c < heartPattern[r].length; c++) {
        if (heartPattern[r][c] === 1) {
          // Inner items are red/pink, outer are purple
          const isCore = r >= 1 && r <= 3 && c >= 2 && c <= 7;
          bricks.push({
            x: startX + c * (brickWidth + 8),
            y: startY + r * (brickHeight + 8),
            width: brickWidth,
            height: brickHeight,
            type: "normal",
            color: isCore ? "#ff0055" : "#cc33ff",
            hp: 1,
            maxHp: 1,
            score: 200,
            visible: true,
          });
        }
      }
    }
  } else if (level === 4) {
    // Bomb Storm & Portals
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < cols; c++) {
        // Place bomb bricks strategically
        const isBomb = (r === 1 && (c === 2 || c === 7)) || (r === 3 && (c === 4 || c === 5));
        const isHard = (r === 0) || (r === 4 && (c === 0 || c === 9));
        bricks.push({
          x: startX + c * (brickWidth + 8),
          y: startY + r * (brickHeight + 8),
          width: brickWidth,
          height: brickHeight,
          type: isBomb ? "bomb" : isHard ? "hard" : "normal",
          color: isBomb ? "#ffaa00" : isHard ? "#94a3b8" : "#10b981",
          hp: isHard ? 2 : 1,
          maxHp: isHard ? 2 : 1,
          score: isBomb ? 400 : isHard ? 250 : 150,
          visible: true,
        });
      }
    }
  }
  return bricks;
};

// ----------------------------------------------------------------------
// React Component
// ----------------------------------------------------------------------
export default function BrickBreakerTool({ manifest }: ToolAppProps) {
  // Game states
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [gameState, setGameState] = useState<"idle" | "playing" | "paused" | "gameover" | "victory">("idle");
  const [baseSpeedSetting, setBaseSpeedSetting] = useState<number>(6); // Speed modifier
  const [effectsEnabled, setEffectsEnabled] = useState<boolean>(true);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Active Buffs indicators
  const [activeBuffs, setActiveBuffs] = useState<{
    laser: number;
    enlarge: number;
    sticky: number;
    shield: boolean;
  }>({
    laser: 0,
    enlarge: 0,
    sticky: 0,
    shield: false,
  });

  // Canvas & Game Loop Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Game Engine Mutable Refs (to avoid re-binding loop in useEffect animation)
  const paddleRef = useRef<Paddle>({
    x: 340,
    y: 550,
    width: 120,
    height: 15,
    color: "#00f0ff"
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const lasersRef = useRef<Laser[]>([]);

  // Key tracking
  const keysRef = useRef<{ left: boolean; right: boolean; space: boolean }>({
    left: false,
    right: false,
    space: false
  });

  // Sticky ball lock (meaning ball rests on paddle)
  const isBallLockedRef = useRef<boolean>(true);
  const lockOffsetRef = useRef<number>(0); // offset of locked ball from paddle center

  // Track shoot debounce
  const lastShootTimeRef = useRef<number>(0);

  // Sync state settings to mutable variables
  const speedRef = useRef<number>(6);
  const comboRef = useRef<number>(0);

  // Load HighScore
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("brick_breaker_highscore");
      if (stored) {
        setHighScore(parseInt(stored, 10));
      }
    }
  }, []);

  // Update speed setting ref
  useEffect(() => {
    speedRef.current = baseSpeedSetting;
  }, [baseSpeedSetting]);

  // Update sound synth mute
  useEffect(() => {
    synth.enabled = !soundMuted;
  }, [soundMuted]);

  // Load levels
  const initLevel = (lvl: number) => {
    bricksRef.current = createLevelBricks(lvl);
    paddleRef.current = {
      x: (LOGICAL_WIDTH - 120) / 2,
      y: 550,
      width: 120,
      height: 15,
      color: "#00f0ff"
    };
    ballsRef.current = [
      {
        x: LOGICAL_WIDTH / 2,
        y: 535,
        dx: 0,
        dy: -speedRef.current,
        radius: 8,
        color: "#ffffff",
        speed: speedRef.current,
        trail: [],
      }
    ];
    particlesRef.current = [];
    powerUpsRef.current = [];
    lasersRef.current = [];
    isBallLockedRef.current = true;
    lockOffsetRef.current = 0;
    comboRef.current = 0;

    setActiveBuffs({
      laser: 0,
      enlarge: 0,
      sticky: 0,
      shield: false
    });
  };

  // Switch level
  const handleLevelChange = (lvl: number) => {
    setLevel(lvl);
    initLevel(lvl);
    setGameState("idle");
  };

  // Reset entire game
  const resetGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    initLevel(1);
    setGameState("idle");
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.left = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.right = true;
      }
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        keysRef.current.space = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keysRef.current.left = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        keysRef.current.right = false;
      }
      if (e.key === " " || e.key === "ArrowUp") {
        keysRef.current.space = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ----------------------------------------------------------------------
  // Spawning Particles
  // ----------------------------------------------------------------------
  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    if (!effectsEnabled) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 20
      });
    }
  };

  // ----------------------------------------------------------------------
  // Spawning Power-up drops
  // ----------------------------------------------------------------------
  const checkSpawnPowerUp = (x: number, y: number) => {
    if (Math.random() > 0.18) return; // 18% chance

    const types: PowerUp["type"][] = ["split", "enlarge", "sticky", "laser", "shield"];
    const type = types[Math.floor(Math.random() * types.length)];

    let color = "#ffffff";
    let label = "🍉";
    if (type === "split") { color = "#38bdf8"; label = "🍉 分裂"; }
    else if (type === "enlarge") { color = "#a855f7"; label = "📏 加长"; }
    else if (type === "sticky") { color = "#facc15"; label = "🧲 磁力"; }
    else if (type === "laser") { color = "#f43f5e"; label = "🔫 激光"; }
    else if (type === "shield") { color = "#10b981"; label = "🛡️ 护盾"; }

    powerUpsRef.current.push({
      x: x - 30,
      y,
      width: 60,
      height: 18,
      type,
      color,
      label
    });
  };

  // ----------------------------------------------------------------------
  // Trigger Explosion effect
  // ----------------------------------------------------------------------
  const triggerBombExplosion = (bombIndex: number, bombBrick: Brick) => {
    synth.playExplosion();
    // Mark as inactive first
    bombBrick.visible = false;
    spawnParticles(bombBrick.x + bombBrick.width / 2, bombBrick.y + bombBrick.height / 2, "#ef4444", 25);

    // Score
    setScore(prev => prev + bombBrick.score);

    // Explode nearby bricks in grid distance (radius ~100px)
    const bombCenterX = bombBrick.x + bombBrick.width / 2;
    const bombCenterY = bombBrick.y + bombBrick.height / 2;

    bricksRef.current.forEach((b) => {
      if (!b.visible) return;
      const bCenterX = b.x + b.width / 2;
      const bCenterY = b.y + b.height / 2;
      const dist = Math.hypot(bCenterX - bombCenterX, bCenterY - bombCenterY);

      if (dist < 120) {
        // Explode this brick too
        b.visible = false;
        spawnParticles(bCenterX, bCenterY, b.color, 12);
        setScore(prev => prev + b.score);
        // If nested bomb
        if (b.type === "bomb") {
          setTimeout(() => {
            triggerBombExplosion(-1, b);
          }, 100);
        }
      }
    });
  };

  // ----------------------------------------------------------------------
  // Launch Ball
  // ----------------------------------------------------------------------
  const launchBall = () => {
    if (!isBallLockedRef.current) return;
    isBallLockedRef.current = false;
    // Launch based on paddle center offset or slight angle
    const angle = (lockOffsetRef.current / (paddleRef.current.width / 2)) * (Math.PI / 4); // max 45deg
    ballsRef.current.forEach(ball => {
      ball.dx = ball.speed * Math.sin(angle);
      ball.dy = -ball.speed * Math.cos(angle);
    });
    synth.playPaddle();
  };

  // ----------------------------------------------------------------------
  // Shoot Laser
  // ----------------------------------------------------------------------
  const shootLaser = () => {
    const now = Date.now();
    if (now - lastShootTimeRef.current < 250) return; // debounce 250ms
    lastShootTimeRef.current = now;

    const p = paddleRef.current;
    lasersRef.current.push({
      x: p.x + 10,
      y: p.y - 10,
      vy: -10
    });
    lasersRef.current.push({
      x: p.x + p.width - 10,
      y: p.y - 10,
      vy: -10
    });
    synth.playWall();
  };

  // ----------------------------------------------------------------------
  // Apply buff triggers
  // ----------------------------------------------------------------------
  const applyPowerUp = (type: PowerUp["type"]) => {
    synth.playPowerup();
    if (type === "split") {
      // For each active ball, clone it into 3 balls
      const newBalls: Ball[] = [];
      ballsRef.current.forEach(ball => {
        // Clone 1
        newBalls.push({
          ...ball,
          dx: ball.dx * 0.9 + (Math.random() - 0.5) * 2,
          dy: -Math.abs(ball.dy),
          trail: []
        });
        // Clone 2
        newBalls.push({
          ...ball,
          dx: ball.dx * 0.8 + (Math.random() - 0.5) * 3,
          dy: -Math.abs(ball.dy) * 0.9,
          trail: []
        });
      });
      // Merge
      if (ballsRef.current.length < 15) {
        ballsRef.current.push(...newBalls);
      }
    } else if (type === "enlarge") {
      setActiveBuffs(prev => ({ ...prev, enlarge: Date.now() + 10000 }));
    } else if (type === "sticky") {
      setActiveBuffs(prev => ({ ...prev, sticky: Date.now() + 15000 }));
    } else if (type === "laser") {
      setActiveBuffs(prev => ({ ...prev, laser: Date.now() + 8000 }));
    } else if (type === "shield") {
      setActiveBuffs(prev => ({ ...prev, shield: true }));
    }
  };

  // Initialize first load
  useEffect(() => {
    initLevel(level);
    // Cleanup loops
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // ----------------------------------------------------------------------
  // MAIN GAME ENGINE LOOP
  // ----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      if (gameState !== "playing") {
        // Still draw the state so it is visible behind overlay
        drawGame(ctx);
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      updatePhysics();
      drawGame(ctx);

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, effectsEnabled, activeBuffs]);

  // Physics engine logic
  const updatePhysics = () => {
    const paddle = paddleRef.current;
    const balls = ballsRef.current;
    const bricks = bricksRef.current;
    const particles = particlesRef.current;
    const powerUps = powerUpsRef.current;
    const lasers = lasersRef.current;

    // 1. Paddle Buff configurations
    const now = Date.now();
    const isEnlarged = activeBuffs.enlarge > now;
    const isSticky = activeBuffs.sticky > now;
    const isLaser = activeBuffs.laser > now;

    paddle.width = isEnlarged ? 180 : 120;
    paddle.color = isLaser ? "#ef4444" : isSticky ? "#facc15" : "#00f0ff";

    // 2. Move Paddle
    const paddleSpeed = 8;
    if (keysRef.current.left) {
      paddle.x = Math.max(0, paddle.x - paddleSpeed);
    }
    if (keysRef.current.right) {
      paddle.x = Math.min(LOGICAL_WIDTH - paddle.width, paddle.x + paddleSpeed);
    }

    // Space action
    if (keysRef.current.space) {
      if (isBallLockedRef.current) {
        launchBall();
      } else if (isLaser) {
        shootLaser();
      }
    }

    // 3. Move Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i];
      laser.y += laser.vy;

      // Check collision with bricks
      let hit = false;
      for (let j = 0; j < bricks.length; j++) {
        const brick = bricks[j];
        if (brick.visible &&
            laser.x >= brick.x && laser.x <= brick.x + brick.width &&
            laser.y >= brick.y && laser.y <= brick.y + brick.height) {
          hit = true;
          damageBrick(j, brick);
          break;
        }
      }

      if (hit || laser.y < 0) {
        lasers.splice(i, 1);
      }
    }

    // 4. Move Balls & Bounce
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];

      // Trail
      if (effectsEnabled) {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 8) ball.trail.shift();
      } else {
        ball.trail = [];
      }

      // If locked to paddle
      if (isBallLockedRef.current && i === 0) {
        ball.x = paddle.x + paddle.width / 2 + lockOffsetRef.current;
        ball.y = paddle.y - ball.radius;
        ball.dx = 0;
        ball.dy = 0;
        continue;
      }

      // Standard movement
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall bounce: Left & Right
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.dx = -ball.dx;
        synth.playWall();
      } else if (ball.x + ball.radius > LOGICAL_WIDTH) {
        ball.x = LOGICAL_WIDTH - ball.radius;
        ball.dx = -ball.dx;
        synth.playWall();
      }

      // Wall bounce: Top
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.dy = -ball.dy;
        synth.playWall();
      }

      // Shield rebound
      if (activeBuffs.shield && ball.y + ball.radius >= 585 && ball.y - ball.radius <= 590) {
        ball.y = 580;
        ball.dy = -Math.abs(ball.dy);
        setActiveBuffs(prev => ({ ...prev, shield: false }));
        synth.playPaddle();
        spawnParticles(ball.x, 588, "#10b981", 15);
        continue;
      }

      // Bottom death boundary
      if (ball.y + ball.radius > LOGICAL_HEIGHT) {
        // Destroy this ball
        balls.splice(i, 1);
        continue;
      }

      // Paddle bounce
      if (ball.dy > 0 &&
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x >= paddle.x &&
          ball.x <= paddle.x + paddle.width) {

        // Sticky trigger
        if (isSticky) {
          isBallLockedRef.current = true;
          lockOffsetRef.current = ball.x - (paddle.x + paddle.width / 2);
          ball.dx = 0;
          ball.dy = 0;
          synth.playPaddle();
          continue;
        }

        // Standard physics bounce: relative point determines angle
        const relativeIntersectX = ball.x - (paddle.x + paddle.width / 2);
        const normalizedIntersectX = relativeIntersectX / (paddle.width / 2);
        // Map to max 65 degrees
        const bounceAngle = normalizedIntersectX * (Math.PI / 2.8);

        ball.dx = ball.speed * Math.sin(bounceAngle);
        ball.dy = -ball.speed * Math.cos(bounceAngle);
        comboRef.current = 0; // reset score combo multiplier on hitting paddle
        synth.playPaddle();
        spawnParticles(ball.x, paddle.y, "#00f0ff", 6);
      }

      // Brick collisions
      for (let j = 0; j < bricks.length; j++) {
        const brick = bricks[j];
        if (!brick.visible) continue;

        // Circle - Rectangle overlapping test
        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
        const distanceX = ball.x - closestX;
        const distanceY = ball.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < ball.radius * ball.radius) {
          // Collision! Determine face side
          const overlapX = ball.radius - Math.abs(distanceX);
          const overlapY = ball.radius - Math.abs(distanceY);

          if (overlapX < overlapY) {
            // Left/Right side bounce
            ball.dx = distanceX > 0 ? Math.abs(ball.dx) : -Math.abs(ball.dx);
            ball.x += distanceX > 0 ? overlapX : -overlapX;
          } else {
            // Top/Bottom side bounce
            ball.dy = distanceY > 0 ? Math.abs(ball.dy) : -Math.abs(ball.dy);
            ball.y += distanceY > 0 ? overlapY : -overlapY;
          }

          damageBrick(j, brick);
          break; // only hit one brick per frame per ball
        }
      }
    }

    // 5. No balls left - Lose a life
    if (balls.length === 0) {
      if (lives > 1) {
        setLives(l => l - 1);
        synth.playGameover();
        // Respawn single ball
        ballsRef.current = [
          {
            x: LOGICAL_WIDTH / 2,
            y: 535,
            dx: 0,
            dy: -speedRef.current,
            radius: 8,
            color: "#ffffff",
            speed: speedRef.current,
            trail: []
          }
        ];
        isBallLockedRef.current = true;
        lockOffsetRef.current = 0;
        comboRef.current = 0;
      } else {
        setLives(0);
        setGameState("gameover");
        synth.playGameover();
      }
    }

    // 6. Move Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.y += 3; // speed

      // Picked up by paddle
      if (p.y + p.height >= paddle.y &&
          p.y <= paddle.y + paddle.height &&
          p.x + p.width >= paddle.x &&
          p.x <= paddle.x + paddle.width) {
        applyPowerUp(p.type);
        powerUps.splice(i, 1);
        continue;
      }

      // Out of bounds
      if (p.y > LOGICAL_HEIGHT) {
        powerUps.splice(i, 1);
      }
    }

    // 7. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    // 8. Check Victory (No visible bricks left, ignoring unbreakable ones if any)
    const activeBricks = bricks.filter(b => b.visible);
    if (activeBricks.length === 0 && bricks.length > 0) {
      setGameState("victory");
      synth.playVictory();

      // Store local highscore if greater
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("brick_breaker_highscore", score.toString());
      }
    }
  };

  // Helper to damage/hit a brick
  const damageBrick = (idx: number, brick: Brick) => {
    brick.hp--;

    if (brick.hp <= 0) {
      brick.visible = false;
      comboRef.current += 1;
      const points = brick.score * comboRef.current;
      setScore(prev => prev + points);

      if (brick.type === "bomb") {
        triggerBombExplosion(idx, brick);
      } else {
        synth.playBrick();
        spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 12);
        checkSpawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
      }
    } else {
      synth.playHardBrick();
      spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, "#cccccc", 5);
      // Brighten color or fade according to health
      if (brick.type === "hard") {
        if (brick.hp === 2) brick.color = "#71717a";
        if (brick.hp === 1) brick.color = "#52525b";
      }
    }
  };

  // ----------------------------------------------------------------------
  // CANVAS RENDERING SYSTEM
  // ----------------------------------------------------------------------
  const drawGame = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas with dark gradient bg
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Grid cyber background effect
    ctx.fillStyle = "#0c0a0f";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (effectsEnabled) {
      ctx.strokeStyle = "rgba(139, 92, 246, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < LOGICAL_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < LOGICAL_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }
    }

    // Draw Shield bottom line
    if (activeBuffs.shield) {
      ctx.save();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      if (effectsEnabled) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#10b981";
      }
      ctx.beginPath();
      ctx.moveTo(0, 590);
      ctx.lineTo(LOGICAL_WIDTH, 590);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Bricks
    bricksRef.current.forEach((brick) => {
      if (!brick.visible) return;

      ctx.save();
      ctx.fillStyle = brick.color;

      // Bloom glow on brick outer rims
      if (effectsEnabled) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = brick.color;
      }

      // Rounded rectangle design
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);
      ctx.fill();

      // Shine highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.roundRect(brick.x + 2, brick.y + 2, brick.width - 4, 3, radius);
      ctx.fill();

      // Show HP on Hard Bricks
      if (brick.type === "hard" && brick.hp > 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `${brick.hp}`,
          brick.x + brick.width / 2,
          brick.y + brick.height / 2
        );
      }

      // Special Bomb symbol
      if (brick.type === "bomb") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Draw Lasers
    lasersRef.current.forEach((laser) => {
      ctx.save();
      ctx.fillStyle = "#f43f5e";
      if (effectsEnabled) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#f43f5e";
      }
      ctx.fillRect(laser.x - 2, laser.y, 4, 12);
      ctx.restore();
    });

    // Draw Power-ups
    powerUpsRef.current.forEach((p) => {
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(12, 10, 15, 0.85)";

      if (effectsEnabled) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
      }

      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, 6);
      ctx.fill();
      ctx.stroke();

      // Text label
      ctx.fillStyle = p.color;
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, p.x + p.width / 2, p.y + p.height / 2);
      ctx.restore();
    });

    // Draw Particles
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (effectsEnabled) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Balls with Trails
    ballsRef.current.forEach((ball) => {
      // Trail
      if (effectsEnabled && ball.trail.length > 0) {
        ball.trail.forEach((point, index) => {
          const tRatio = (index + 1) / ball.trail.length;
          ctx.save();
          ctx.globalAlpha = tRatio * 0.25;
          ctx.fillStyle = ball.color;
          ctx.beginPath();
          ctx.arc(point.x, point.y, ball.radius * (0.4 + tRatio * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Ball core
      ctx.save();
      ctx.fillStyle = ball.color;
      if (effectsEnabled) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffffff";
      }
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Paddle
    const p = paddleRef.current;
    ctx.save();
    ctx.fillStyle = p.color;
    if (effectsEnabled) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
    }
    // Rounded paddle
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.width, p.height, 7);
    ctx.fill();

    // Laser nozzles visual decoration
    if (activeBuffs.laser > Date.now()) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(p.x + 8, p.y - 4, 4, 4);
      ctx.fillRect(p.x + p.width - 12, p.y - 4, 4, 4);
    }

    ctx.restore();
  };

  // Adjust canvas physical sizes on container resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const targetWidth = rect.width;
      const targetHeight = targetWidth * (LOGICAL_HEIGHT / LOGICAL_WIDTH);

      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      // Set physical sizing for drawing
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;

      // Draw immediately once
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr * targetWidth / LOGICAL_WIDTH, dpr * targetHeight / LOGICAL_HEIGHT);
        drawGame(ctx);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle Drag on mouse and Touch moving
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    // Map to logic coordinates 800 width
    const logicX = (clientX / rect.width) * LOGICAL_WIDTH;

    // Center paddle relative to logicX
    const halfWidth = paddleRef.current.width / 2;
    paddleRef.current.x = Math.max(0, Math.min(LOGICAL_WIDTH - paddleRef.current.width, logicX - halfWidth));
  };

  const handlePointerDown = () => {
    if (gameState !== "playing") return;
    if (isBallLockedRef.current) {
      launchBall();
    } else if (activeBuffs.laser > Date.now()) {
      shootLaser();
    }
  };

  // Virtual controller actions for touch screens
  const handleVirtualLeft = (down: boolean) => {
    keysRef.current.left = down;
  };

  const handleVirtualRight = (down: boolean) => {
    keysRef.current.right = down;
  };

  const handleVirtualAction = () => {
    if (gameState === "playing") {
      if (isBallLockedRef.current) {
        launchBall();
      } else if (activeBuffs.laser > Date.now()) {
        shootLaser();
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #0f0a1c 0%, #05020a 100%)",
        borderRadius: "16px",
        border: "1px solid rgba(139, 92, 246, 0.15)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        color: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Header controls & Score boards */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                margin: 0,
                background: "linear-gradient(to right, #00f0ff, #ff007f)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Neon Breaker
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#a1a1aa" }}>
              赛博霓虹打砖块
            </p>
          </div>

          {/* Level Picker Selector */}
          <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.05)", padding: "0.25rem", borderRadius: "8px" }}>
            {[1, 2, 3, 4].map(l => (
              <button
                key={l}
                onClick={() => handleLevelChange(l)}
                style={{
                  background: level === l ? "linear-gradient(to right, #8b5cf6, #d946ef)" : "transparent",
                  color: level === l ? "#fff" : "#a1a1aa",
                  border: "none",
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                关卡 {l}
              </button>
            ))}
          </div>
        </div>

        {/* Dash statistics info */}
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>SCORE</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#facc15" }}>{score}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>BEST</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#38bdf8" }}>{highScore}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>LIVES</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#ef4444", display: "flex", justifyContent: "flex-end", gap: "2px" }}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <span key={idx} style={{ opacity: idx < lives ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Arena */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          position: "relative",
          borderRadius: "12px",
          border: "2px solid rgba(0, 240, 255, 0.3)",
          overflow: "hidden",
          boxShadow: "0 0 20px rgba(0, 240, 255, 0.15)",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          style={{
            display: "block",
            cursor: gameState === "playing" ? "none" : "default",
          }}
        />

        {/* OVERLAYS FOR GAME STATES */}
        {gameState !== "playing" && (
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
              backdropFilter: "blur(4px)"
            }}
          >
            {gameState === "idle" && (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "2rem", color: "#00f0ff", margin: "0 0 0.5rem" }}>关卡 {level} 已就绪</h2>
                <p style={{ color: "#a1a1aa", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
                  键盘左右键 / 鼠标拖拽控制挡板，空格键发射球起跳
                </p>
                <button
                  onClick={() => setGameState("playing")}
                  style={{
                    background: "linear-gradient(to right, #00f0ff, #ff007f)",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 2rem",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    borderRadius: "30px",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)",
                    transition: "transform 0.2s"
                  }}
                >
                  开始挑战
                </button>
              </div>
            )}

            {gameState === "paused" && (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "2rem", color: "#facc15", margin: "0 0 1.5rem" }}>游戏暂停</h2>
                <button
                  onClick={() => setGameState("playing")}
                  style={{
                    background: "linear-gradient(to right, #facc15, #ffaa00)",
                    color: "#000",
                    border: "none",
                    padding: "0.75rem 2rem",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    borderRadius: "30px",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(250, 204, 21, 0.4)"
                  }}
                >
                  继续游戏
                </button>
              </div>
            )}

            {gameState === "gameover" && (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "2.5rem", color: "#ef4444", margin: "0 0 0.5rem", textTransform: "uppercase" }}>Game Over</h2>
                <p style={{ color: "#a1a1aa", fontSize: "1rem", margin: "0 0 1.5rem" }}>最终得分: {score}</p>
                <button
                  onClick={resetGame}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 2rem",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    borderRadius: "30px",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(239, 68, 68, 0.4)"
                  }}
                >
                  重新开始
                </button>
              </div>
            )}

            {gameState === "victory" && (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "2.5rem", color: "#10b981", margin: "0 0 0.5rem" }}>挑战成功! 🎉</h2>
                <p style={{ color: "#a1a1aa", fontSize: "1rem", margin: "0 0 1.5rem" }}>完成得分: {score}</p>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    onClick={resetGame}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: "0.75rem 1.5rem",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      borderRadius: "30px",
                      cursor: "pointer",
                    }}
                  >
                    重置
                  </button>
                  {level < 4 && (
                    <button
                      onClick={() => handleLevelChange(level + 1)}
                      style={{
                        background: "linear-gradient(to right, #10b981, #34d399)",
                        color: "#000",
                        border: "none",
                        padding: "0.75rem 2.0rem",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        borderRadius: "30px",
                        cursor: "pointer",
                        boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)"
                      }}
                    >
                      下一关
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buff Monitor & Game Toolbar Settings */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "rgba(255,255,255,0.03)",
          padding: "1rem",
          borderRadius: "10px",
          border: "1px solid rgba(139, 92, 246, 0.1)"
        }}
      >
        {/* Buff Tracker Panel */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {activeBuffs.enlarge > Date.now() && (
            <span style={{ fontSize: "0.75rem", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.4)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
              📏 挡板加长
            </span>
          )}
          {activeBuffs.sticky > Date.now() && (
            <span style={{ fontSize: "0.75rem", background: "rgba(250, 204, 21, 0.2)", color: "#fef08a", border: "1px solid rgba(250, 204, 21, 0.4)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
              🧲 磁力吸附
            </span>
          )}
          {activeBuffs.laser > Date.now() && (
            <span style={{ fontSize: "0.75rem", background: "rgba(244, 63, 94, 0.2)", color: "#fda4af", border: "1px solid rgba(244, 63, 94, 0.4)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
              🔫 激光就绪
            </span>
          )}
          {activeBuffs.shield && (
            <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
              🛡️ 底网护盾
            </span>
          )}
          {!(activeBuffs.enlarge > Date.now()) && !(activeBuffs.sticky > Date.now()) && !(activeBuffs.laser > Date.now()) && !activeBuffs.shield && (
            <span style={{ fontSize: "0.75rem", color: "#71717a" }}>无活跃增益效果</span>
          )}
        </div>

        {/* Bottom Options and Configs */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Pause Toggle */}
          {gameState === "playing" && (
            <button
              onClick={() => setGameState("paused")}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "none",
                padding: "0.4rem 0.8rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              ⏸️ 暂停
            </button>
          )}

          {/* Speed Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>速度:</span>
            <select
              value={baseSpeedSetting}
              onChange={(e) => setBaseSpeedSetting(Number(e.target.value))}
              style={{
                background: "#161320",
                color: "#fff",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value={4}>休闲 (4x)</option>
              <option value={6}>标准 (6x)</option>
              <option value={8}>极速 (8x)</option>
            </select>
          </div>

          {/* Particle Switch */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontSize: "0.75rem", color: "#a1a1aa" }}>
            <input
              type="checkbox"
              checked={effectsEnabled}
              onChange={(e) => setEffectsEnabled(e.target.checked)}
              style={{ accentColor: "#8b5cf6" }}
            />
            霓虹辉光与粒子
          </label>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            style={{
              background: "transparent",
              color: soundMuted ? "#ef4444" : "#10b981",
              border: "1px solid currentColor",
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            {soundMuted ? "🔇 静音" : "🔊 音效"}
          </button>
        </div>
      </div>

      {/* MOBILE CONTROLLER */}
      {typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 0.5rem",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.05)"
          }}
        >
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onPointerDown={() => handleVirtualLeft(true)}
              onPointerUp={() => handleVirtualLeft(false)}
              onPointerLeave={() => handleVirtualLeft(false)}
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(139, 92, 246, 0.15)",
                color: "#c084fc",
                border: "2px solid rgba(139, 92, 246, 0.3)",
                fontSize: "1.5rem",
                borderRadius: "50%",
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ◀
            </button>
            <button
              onPointerDown={() => handleVirtualRight(true)}
              onPointerUp={() => handleVirtualRight(false)}
              onPointerLeave={() => handleVirtualRight(false)}
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(139, 92, 246, 0.15)",
                color: "#c084fc",
                border: "2px solid rgba(139, 92, 246, 0.3)",
                fontSize: "1.5rem",
                borderRadius: "50%",
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ▶
            </button>
          </div>

          <button
            onClick={handleVirtualAction}
            style={{
              width: "120px",
              height: "50px",
              background: "linear-gradient(to right, #00f0ff, #ff007f)",
              color: "#fff",
              border: "none",
              fontWeight: "bold",
              fontSize: "0.9rem",
              borderRadius: "25px",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 0, 127, 0.3)",
              userSelect: "none"
            }}
          >
            {isBallLockedRef.current ? "LAUNCH 发射" : activeBuffs.laser > Date.now() ? "FIRE 射击" : "ACTION 行动"}
          </button>
        </div>
      )}

      {/* Manual / Instructions */}
      <div style={{ fontSize: "0.8rem", color: "#71717a", lineHeight: "1.4" }}>
        <h4 style={{ margin: "0 0 0.25rem", color: "#a1a1aa" }}>玩法攻略</h4>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>鼠标移动至 Canvas 内可直接划动拖拽挡板；亦可使用键盘 <b>A/D</b> 或 <b>左/右方向键</b> 操纵挡板。</li>
          <li>游戏刚开始或拿到 <b>磁力 🧲</b> 增益时，球将附着于挡板上，按 <b>空格键</b> 或 <b>点击屏幕</b> 即可重新发射。</li>
          <li>连续不落地敲碎砖块会获得 <b>Combo 分数翻倍</b> 机制，吃到 🍉、📏、🔫 等掉落道具能让清场效率倍增。</li>
          <li>如果游戏界面在大屏或老旧设备中出现卡顿，可取消勾选 <b>“霓虹辉光与粒子”</b> 选项以获得极致流畅性能。</li>
        </ul>
      </div>
    </div>
  );
}
