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

      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else if (freqs.length > 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
        const step = duration / (freqs.length - 1);
        for (let i = 1; i < freqs.length; i++) {
          osc.frequency.exponentialRampToValueAtTime(freqs[i], now + i * step);
        }
      }

      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio context blocked
    }
  }

  playFlap() {
    this.playTone([260, 480], 0.12, "triangle", 0.15);
  }

  playScore() {
    this.playTone([523.3, 659.3, 784.0, 1046.5], 0.25, "sine", 0.12);
  }

  playShield() {
    this.playTone([300, 600, 400, 800], 0.3, "sine", 0.15);
  }

  playSlowMo() {
    this.playTone([400, 200, 150], 0.4, "sawtooth", 0.15);
  }

  playBoost() {
    this.playTone([200, 800, 1600], 0.5, "sawtooth", 0.18);
  }

  playCrash() {
    this.playTone([220, 80], 0.15, "sawtooth", 0.25);
  }

  playExplosion() {
    this.playTone([180, 50], 0.4, "sawtooth", 0.3);
  }

  playGameOver() {
    this.playTone([392.0, 311.1, 261.6, 196.0], 0.6, "sawtooth", 0.2);
  }
}

const synth = new SoundSynth();

// ----------------------------------------------------------------------
// Skin and Theme Configurations
// ----------------------------------------------------------------------
interface Skin {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  glow: string;
  trail: string;
  description: string;
  descriptionEn: string;
}

const SKINS: Skin[] = [
  {
    id: "neon-cyan",
    name: "赛博脉冲 (Cyan)",
    nameEn: "Cyber Pulse",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.6)",
    trail: "#00a8ff",
    description: "经典赛博蓝，带炫目冷光尾迹。",
    descriptionEn: "Classic cyber blue with cyan spark trails."
  },
  {
    id: "neon-pink",
    name: "霓虹极光 (Pink)",
    nameEn: "Neon Aurora",
    color: "#ff007f",
    glow: "rgba(255, 0, 127, 0.6)",
    trail: "#ff00a0",
    description: "活力魅影粉，极速消逝的星尘。",
    descriptionEn: "Vivid pink with fading stellar particles."
  },
  {
    id: "neon-green",
    name: "黑客帝国 (Green)",
    nameEn: "Matrix Runner",
    color: "#39ff14",
    glow: "rgba(57, 255, 20, 0.6)",
    trail: "#00ff66",
    description: "数字雨翠绿，破译引力法则。",
    descriptionEn: "Matrix green with stream code particles."
  },
  {
    id: "neon-gold",
    name: "太阳风暴 (Gold)",
    nameEn: "Solar Flare",
    color: "#ffaa00",
    glow: "rgba(255, 170, 0, 0.6)",
    trail: "#ff6600",
    description: "熔火烈焰橙，蕴含恒星能量。",
    descriptionEn: "Molten gold with solar fire bursts."
  }
];

// ----------------------------------------------------------------------
// Types and Constants
// ----------------------------------------------------------------------
type Difficulty = "easy" | "medium" | "hard";
type PowerupType = "shield" | "slowmo" | "boost";

interface Obstacle {
  x: number;
  width: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
  pulseTime: number;
}

interface PowerupItem {
  x: number;
  y: number;
  type: PowerupType;
  collected: boolean;
  pulse: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export default function CyberFlyer({ locale }: ToolAppProps) {
  const isZh = locale === "zh";

  // State Management
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [selectedSkinId, setSelectedSkinId] = useState("neon-cyan");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active power-ups remaining duration (in milliseconds)
  const [activeShield, setActiveShield] = useState(false);
  const [slowmoTime, setSlowmoTime] = useState(0); // 0 means inactive
  const [boostTime, setBoostTime] = useState(0);  // 0 means inactive

  // Refs for Game Loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    gameState: "menu",
    score: 0,
    difficulty: "medium" as Difficulty,
    skin: SKINS[0],
    
    // Physics
    shipY: 250,
    shipVelocity: 0,
    gravity: 0.35,
    lift: -6.5,
    
    // Elements
    obstacles: [] as Obstacle[],
    powerups: [] as PowerupItem[],
    particles: [] as Particle[],
    
    // Timers & Active Powerups
    shieldActive: false,
    slowmoTimeRemaining: 0, // ms
    boostTimeRemaining: 0,  // ms
    
    // Rendering details
    screenShake: 0,
    backgroundOffset: 0,
    frameIndex: 0,
    lastTime: 0
  });

  // Keep refs synchronized
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.score = score;
  }, [score]);

  useEffect(() => {
    stateRef.current.difficulty = difficulty;
  }, [difficulty]);

  useEffect(() => {
    const skin = SKINS.find(s => s.id === selectedSkinId) || SKINS[0];
    stateRef.current.skin = skin;
  }, [selectedSkinId]);

  useEffect(() => {
    synth.enabled = soundEnabled;
  }, [soundEnabled]);

  // Load highscore
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tool-platform:cyber-flyer:highscore");
      if (saved) {
        setHighScore(parseInt(saved, 10));
      }
    }
  }, []);

  // Update highscore
  const updateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      if (typeof window !== "undefined") {
        localStorage.setItem("tool-platform:cyber-flyer:highscore", newScore.toString());
      }
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        triggerFlap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Trigger Flap or Start Game
  const triggerFlap = () => {
    const state = stateRef.current;
    if (state.gameState === "menu") {
      startGame();
    } else if (state.gameState === "playing") {
      // In boost mode, flap is not required but still gives sound effect
      if (state.boostTimeRemaining > 0) {
        synth.playFlap();
        return;
      }
      
      const timeScale = state.slowmoTimeRemaining > 0 ? 0.6 : 1.0;
      state.shipVelocity = state.lift * timeScale;
      synth.playFlap();
      
      // Spawn trail particles
      const skin = state.skin;
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: 100 - 10,
          y: state.shipY,
          vx: -(Math.random() * 3 + 2),
          vy: (Math.random() - 0.5) * 4,
          color: skin.trail,
          size: Math.random() * 4 + 2,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          alpha: 1
        });
      }
    } else if (state.gameState === "gameover") {
      startGame();
    }
  };

  // Initialize Game State
  const startGame = () => {
    const state = stateRef.current;
    state.shipY = 250;
    state.shipVelocity = 0;
    state.obstacles = [];
    state.powerups = [];
    state.particles = [];
    state.shieldActive = false;
    state.slowmoTimeRemaining = 0;
    state.boostTimeRemaining = 0;
    state.screenShake = 0;
    state.frameIndex = 0;
    state.lastTime = performance.now();

    setActiveShield(false);
    setSlowmoTime(0);
    setBoostTime(0);
    setScore(0);
    setGameState("playing");
  };

  // Run Game Engine Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const gameLoop = (timestamp: number) => {
      const state = stateRef.current;
      const elapsed = timestamp - state.lastTime;
      state.lastTime = timestamp;

      // Limit dt to avoid massive leaps in laggy tabs
      const dt = Math.min(elapsed, 50);

      // 1. Update Game Logic if Playing
      if (state.gameState === "playing") {
        updatePhysics(dt);
      }

      // 2. Render Screen
      render(ctx, canvas.width, canvas.height);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Update Game Elements Physics
  const updatePhysics = (dt: number) => {
    const state = stateRef.current;
    state.frameIndex++;

    // Power-up Time counters
    if (state.slowmoTimeRemaining > 0) {
      state.slowmoTimeRemaining = Math.max(0, state.slowmoTimeRemaining - dt);
      setSlowmoTime(Math.ceil(state.slowmoTimeRemaining));
    }
    if (state.boostTimeRemaining > 0) {
      state.boostTimeRemaining = Math.max(0, state.boostTimeRemaining - dt);
      setBoostTime(Math.ceil(state.boostTimeRemaining));
      if (state.boostTimeRemaining === 0) {
        // Boost finished
        state.shipVelocity = 0;
      }
    }

    const timeScale = state.slowmoTimeRemaining > 0 ? 0.5 : 1.0;
    const isBoostActive = state.boostTimeRemaining > 0;

    // Movement speed settings
    let gameSpeed = 3.0;
    if (state.difficulty === "easy") gameSpeed = 2.2;
    if (state.difficulty === "hard") gameSpeed = 3.8;
    
    // Scale speed by time slowing effect
    gameSpeed *= timeScale;
    
    // Boost mode speeds up movement to feel awesome!
    if (isBoostActive) {
      gameSpeed *= 1.8;
    }

    // Ship physics
    if (isBoostActive) {
      // Hover in center smoothly
      const targetY = 300 + Math.sin(state.frameIndex * 0.1) * 15;
      state.shipY += (targetY - state.shipY) * 0.1;
      state.shipVelocity = 0;
    } else {
      // Normal physics
      state.shipVelocity += state.gravity;
      state.shipY += state.shipVelocity;
    }

    // Floor and Ceiling Collisions
    if (state.shipY > 580 || state.shipY < 20) {
      if (state.shipY > 580) state.shipY = 580;
      if (state.shipY < 20) state.shipY = 20;

      if (!isBoostActive) {
        handlePlayerHit();
      }
    }

    // Scrolling background grid offset
    state.backgroundOffset = (state.backgroundOffset + gameSpeed) % 80;

    // Background Particle/Exhaust Trail Spawning
    const spawnRate = isBoostActive ? 1 : 4;
    if (state.frameIndex % spawnRate === 0) {
      state.particles.push({
        x: 100 - 15,
        y: state.shipY + (Math.random() - 0.5) * 8,
        vx: -gameSpeed * 0.8 - (Math.random() * 2),
        vy: (Math.random() - 0.5) * 1.5,
        color: isBoostActive ? "#ffffff" : state.skin.trail,
        size: isBoostActive ? Math.random() * 6 + 3 : Math.random() * 3 + 1,
        life: 0,
        maxLife: isBoostActive ? 15 + Math.random() * 15 : 25 + Math.random() * 15,
        alpha: 1.0
      });
    }

    // Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - (p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        state.particles.splice(i, 1);
      }
    }

    // ------------------------------------------------------------------
    // Handle Obstacles Spawning & Update
    // ------------------------------------------------------------------
    let spawnGap = 160; // Distance between pipes
    if (state.difficulty === "easy") spawnGap = 190;
    if (state.difficulty === "hard") spawnGap = 135;

    // Check if we need to spawn a new pipe
    let lastPipeX = 0;
    if (state.obstacles.length > 0) {
      lastPipeX = state.obstacles[state.obstacles.length - 1].x;
    }

    if (state.obstacles.length === 0 || lastPipeX < 480 - spawnGap) {
      spawnObstaclePair();
    }

    // Move Obstacles & Check Collisions
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= gameSpeed;
      obs.pulseTime += 0.05;

      // Hard mode: Wobble pipes up and down
      if (state.difficulty === "hard") {
        const wobble = Math.sin(state.frameIndex * 0.02 + i) * 0.8;
        obs.topHeight += wobble;
        obs.bottomHeight -= wobble;
      }

      // Check Point Score
      if (!obs.passed && obs.x + obs.width < 100) {
        obs.passed = true;
        setScore(prev => {
          const newScore = prev + 1;
          updateHighScore(newScore);
          return newScore;
        });
        synth.playScore();

        // Spawn gold flash particles
        for (let k = 0; k < 6; k++) {
          state.particles.push({
            x: 100,
            y: state.shipY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: "#fffa00",
            size: Math.random() * 3 + 2,
            life: 0,
            maxLife: 20 + Math.random() * 10,
            alpha: 1.0
          });
        }
      }

      // Check Collision with Ship
      if (obs.x < 100 + 15 && obs.x + obs.width > 100 - 15) {
        // Horizontal overlap, verify vertical
        const hitTop = state.shipY - 10 < obs.topHeight;
        const hitBottom = state.shipY + 10 > 600 - obs.bottomHeight;
        
        if (hitTop || hitBottom) {
          if (isBoostActive) {
            // Smash the obstacle!
            state.screenShake = 12;
            synth.playExplosion();
            // Emit splash particles
            for (let k = 0; k < 25; k++) {
              state.particles.push({
                x: obs.x + obs.width / 2,
                y: hitTop ? obs.topHeight : 600 - obs.bottomHeight,
                vx: (Math.random() - 0.2) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: "#ff007f",
                size: Math.random() * 6 + 2,
                life: 0,
                maxLife: 30 + Math.random() * 20,
                alpha: 1
              });
            }
            // Remove pipe or push far away so player runs through it
            state.obstacles.splice(i, 1);
            continue;
          } else {
            handlePlayerHit();
          }
        }
      }

      // Delete offscreen pipes
      if (obs.x + obs.width < -50) {
        state.obstacles.splice(i, 1);
      }
    }

    // ------------------------------------------------------------------
    // Handle Powerups Spawning & Update
    // ------------------------------------------------------------------
    // Occasionally spawn power-ups in gaps
    if (state.frameIndex % 300 === 0 && Math.random() < 0.7 && state.obstacles.length > 0) {
      // Find space between last two pipes
      const lastPipe = state.obstacles[state.obstacles.length - 1];
      if (lastPipe.x > 300) {
        const types: PowerupType[] = ["shield", "slowmo", "boost"];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        // Target height center of the gap
        const gapTop = lastPipe.topHeight;
        const gapBottom = 600 - lastPipe.bottomHeight;
        const targetY = gapTop + (gapBottom - gapTop) / 2;

        state.powerups.push({
          x: lastPipe.x + 80,
          y: targetY + (Math.random() - 0.5) * 40,
          type: randomType,
          collected: false,
          pulse: 0
        });
      }
    }

    // Move & collect powerups
    for (let i = state.powerups.length - 1; i >= 0; i--) {
      const p = state.powerups[i];
      p.x -= gameSpeed;
      p.pulse += 0.08;

      // Vacuum effect: in Boost mode, pull powerups/items towards ship!
      if (isBoostActive && p.x > 100) {
        const dx = 100 - p.x;
        const dy = state.shipY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.x += (dx / dist) * 12;
          p.y += (dy / dist) * 12;
        }
      }

      // Check intersection
      const dist = Math.sqrt(Math.pow(p.x - 100, 2) + Math.pow(p.y - state.shipY, 2));
      if (dist < 28) {
        collectPowerup(p.type);
        state.powerups.splice(i, 1);
        continue;
      }

      // Delete offscreen powerups
      if (p.x < -30) {
        state.powerups.splice(i, 1);
      }
    }

    // Decay Screen Shake
    if (state.screenShake > 0) {
      state.screenShake *= 0.9;
      if (state.screenShake < 0.5) state.screenShake = 0;
    }
  };

  // Spawn Obstacles
  const spawnObstaclePair = () => {
    const state = stateRef.current;
    const width = 60;
    let gap = 175; // Empty vertical space between top and bottom pipes
    if (state.difficulty === "easy") gap = 205;
    if (state.difficulty === "hard") gap = 145;

    // Minimum and maximum heights
    const minHeight = 60;
    const maxHeight = 600 - gap - minHeight;
    const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
    const bottomHeight = 600 - topHeight - gap;

    state.obstacles.push({
      x: 500,
      width,
      topHeight,
      bottomHeight,
      passed: false,
      pulseTime: Math.random() * 10
    });
  };

  // Collect Power-up Action
  const collectPowerup = (type: PowerupType) => {
    const state = stateRef.current;
    
    // Spawn flashy feedback particles
    const color = type === "shield" ? "#00ffff" : type === "slowmo" ? "#a000ff" : "#fffa00";
    for (let i = 0; i < 20; i++) {
      state.particles.push({
        x: 100,
        y: state.shipY,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: 25 + Math.random() * 15,
        alpha: 1.0
      });
    }

    if (type === "shield") {
      state.shieldActive = true;
      setActiveShield(true);
      synth.playShield();
    } else if (type === "slowmo") {
      state.slowmoTimeRemaining = 6000; // 6 seconds
      setSlowmoTime(6000);
      synth.playSlowMo();
    } else if (type === "boost") {
      state.boostTimeRemaining = 3500; // 3.5 seconds
      setBoostTime(3500);
      state.screenShake = 6;
      synth.playBoost();
    }
  };

  // Player gets hit (Collision)
  const handlePlayerHit = () => {
    const state = stateRef.current;
    
    // 1. If shield is active, consume it and save player
    if (state.shieldActive) {
      state.shieldActive = false;
      setActiveShield(false);
      state.screenShake = 8;
      synth.playCrash();
      
      // Spawn burst particles to indicate shield burst
      for (let i = 0; i < 25; i++) {
        state.particles.push({
          x: 100,
          y: state.shipY,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.5) * 7,
          color: "#00ffff",
          size: Math.random() * 4 + 2,
          life: 0,
          maxLife: 20 + Math.random() * 15,
          alpha: 1.0
        });
      }
      // Temporarily push ship away from danger
      state.shipVelocity = -3.5;
      return;
    }

    // 2. Otherwise: Game Over!
    state.screenShake = 22;
    synth.playExplosion();
    synth.playGameOver();

    // Spawn huge explosion particles
    for (let i = 0; i < 50; i++) {
      state.particles.push({
        x: 100,
        y: state.shipY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: i % 2 === 0 ? state.skin.color : "#ff0000",
        size: Math.random() * 7 + 2,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        alpha: 1.0
      });
    }

    setGameState("gameover");
  };

  // ----------------------------------------------------------------------
  // Canvas Rendering Logic
  // ----------------------------------------------------------------------
  const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;
    const skin = state.skin;
    const isSlowmo = state.slowmoTimeRemaining > 0;
    const isBoost = state.boostTimeRemaining > 0;

    // Reset Canvas
    ctx.restore();
    ctx.save();

    // Handle screen shake
    if (state.screenShake > 0) {
      const dx = (Math.random() - 0.5) * state.screenShake;
      const dy = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(dx, dy);
    }

    // Background fill (Dark space blue)
    ctx.fillStyle = "#0c0d19";
    ctx.fillRect(0, 0, width, height);

    // Dynamic Scrolling Grid (Synthwave / Cyber grid floor)
    ctx.lineWidth = 1;
    ctx.strokeStyle = isSlowmo ? "rgba(100, 0, 200, 0.15)" : "rgba(0, 240, 255, 0.1)";
    
    // Draw horizon line
    const horizon = 420;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();

    // Draw perspective lines (floor grid)
    for (let x = -200; x < width + 200; x += 60) {
      ctx.beginPath();
      ctx.moveTo(width / 2, horizon);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal grid lines moving towards viewer
    const gridSpeed = state.backgroundOffset;
    for (let y = horizon; y < height; y += 20) {
      // Perspective scaling
      const adjustedY = y + (gridSpeed % 20) * ((y - horizon) / (height - horizon));
      ctx.beginPath();
      ctx.moveTo(0, adjustedY);
      ctx.lineTo(width, adjustedY);
      ctx.stroke();
    }

    // Ambient stars in sky
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 20; i++) {
      const starX = (Math.sin(i * 999) * 0.5 + 0.5) * width;
      const starY = (Math.cos(i * 123) * 0.5 + 0.5) * horizon;
      ctx.fillRect(starX, starY, 1.5, 1.5);
    }

    // Ambient neon scanlines/grid layout
    if (isSlowmo) {
      ctx.fillStyle = "rgba(0, 80, 255, 0.05)";
      ctx.fillRect(0, 0, width, height);
    }
    if (isBoost) {
      ctx.fillStyle = "rgba(255, 180, 0, 0.03)";
      ctx.fillRect(0, 0, width, height);
    }

    // Draw Particles
    ctx.shadowBlur = 0; // Turn off shadows for particles to keep performance high
    for (const p of state.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Draw Obstacles (Pipes)
    ctx.shadowBlur = 15;
    for (const obs of state.obstacles) {
      const pipeColor = isSlowmo ? "#aa00ff" : skin.color;
      ctx.strokeStyle = pipeColor;
      ctx.shadowColor = pipeColor;
      ctx.lineWidth = 3;

      // Glow pulse
      const glowScale = Math.sin(obs.pulseTime) * 0.15 + 0.85;
      ctx.shadowBlur = 12 * glowScale;

      // Draw Top Pipe
      ctx.fillStyle = "rgba(12, 13, 25, 0.95)";
      ctx.beginPath();
      // Main column
      ctx.rect(obs.x, -5, obs.width, obs.topHeight + 5);
      // Pipe flange cap
      ctx.rect(obs.x - 4, obs.topHeight - 16, obs.width + 8, 16);
      ctx.fill();
      ctx.stroke();

      // Draw Bottom Pipe
      ctx.beginPath();
      // Main column
      ctx.rect(obs.x, 600 - obs.bottomHeight, obs.width, obs.bottomHeight + 5);
      // Pipe flange cap
      ctx.rect(obs.x - 4, 600 - obs.bottomHeight, obs.width + 8, 16);
      ctx.fill();
      ctx.stroke();

      // Inside tech lines for extra detail
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isSlowmo ? "rgba(170, 0, 255, 0.3)" : `${skin.color}44`;
      ctx.lineWidth = 1;
      
      // Top lines
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.width / 2, 0);
      ctx.lineTo(obs.x + obs.width / 2, obs.topHeight - 20);
      ctx.stroke();

      // Bottom lines
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.width / 2, 600 - obs.bottomHeight + 20);
      ctx.lineTo(obs.x + obs.width / 2, height);
      ctx.stroke();
    }

    // Draw Power-ups
    for (const p of state.powerups) {
      const pulseSize = 14 + Math.sin(p.pulse * 2.5) * 3.5;
      
      ctx.shadowBlur = 18;
      if (p.type === "shield") {
        ctx.fillStyle = "rgba(0, 240, 255, 0.2)";
        ctx.strokeStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner Shield Icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x + 5, p.y - 2);
        ctx.lineTo(p.x + 4, p.y + 4);
        ctx.lineTo(p.x, p.y + 7);
        ctx.lineTo(p.x - 4, p.y + 4);
        ctx.lineTo(p.x - 5, p.y - 2);
        ctx.closePath();
        ctx.fill();

      } else if (p.type === "slowmo") {
        ctx.fillStyle = "rgba(160, 32, 240, 0.25)";
        ctx.strokeStyle = "#c040ff";
        ctx.shadowColor = "#c040ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner Hourglass Icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p.x - 5, p.y - 6, 10, 2);
        ctx.fillRect(p.x - 5, p.y + 4, 10, 2);
        ctx.beginPath();
        ctx.moveTo(p.x - 4, p.y - 4);
        ctx.lineTo(p.x + 4, p.y - 4);
        ctx.lineTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y + 4);
        ctx.lineTo(p.x + 4, p.y + 4);
        ctx.closePath();
        ctx.fill();

      } else if (p.type === "boost") {
        ctx.fillStyle = "rgba(255, 230, 0, 0.25)";
        ctx.strokeStyle = "#ffea00";
        ctx.shadowColor = "#ffea00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner Bolt/Lightning Icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(p.x + 1, p.y - 7);
        ctx.lineTo(p.x - 5, p.y + 1);
        ctx.lineTo(p.x - 1, p.y + 1);
        ctx.lineTo(p.x - 1, p.y + 7);
        ctx.lineTo(p.x + 5, p.y - 1);
        ctx.lineTo(p.x + 1, p.y - 1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw Spaceship Player
    ctx.shadowBlur = 20;
    const playerGlowColor = isBoost ? "#ffffff" : (isSlowmo ? "#d300ff" : skin.color);
    ctx.strokeStyle = playerGlowColor;
    ctx.shadowColor = playerGlowColor;
    ctx.lineWidth = 2.5;

    // Outer shield layer (bubble)
    if (state.shieldActive) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
      ctx.shadowColor = "#00f0ff";
      ctx.beginPath();
      ctx.arc(100, state.shipY, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Spaceship fuselage
    ctx.fillStyle = "#0a0c14";
    ctx.shadowColor = playerGlowColor;
    ctx.lineWidth = 3;

    // Draw ship geometry pointing right
    ctx.beginPath();
    ctx.moveTo(100 + 20, state.shipY); // Nose cone
    ctx.lineTo(100 - 14, state.shipY - 12); // Upper wingtip
    ctx.lineTo(100 - 6, state.shipY - 3); // Top fuselage inset
    ctx.lineTo(100 - 18, state.shipY); // Exhaust nozzle center
    ctx.lineTo(100 - 6, state.shipY + 3); // Bottom fuselage inset
    ctx.lineTo(100 - 14, state.shipY + 12); // Lower wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner glowing cockpit/thruster indicator
    ctx.shadowBlur = 5;
    ctx.fillStyle = isBoost ? "#ffb400" : skin.color;
    ctx.beginPath();
    ctx.arc(100 - 4, state.shipY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Clean up shadow blur
    ctx.shadowBlur = 0;
  };

  return (
    <div className="cyber-container">
      {/* Dynamic inline stylesheets for neon buttons and retro controls */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cyber-container {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          gap: 2rem;
          padding: 1.5rem;
          color: #e2e8f0;
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          width: 100%;
          min-height: 700px;
        }

        .arcade-cabinet {
          position: relative;
          background: #141526;
          border: 4px solid #1f2240;
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5), 
                      0 0 20px rgba(0, 240, 255, 0.15);
          width: 480px;
          max-width: 100%;
        }

        .arcade-screen {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #282b52;
          box-shadow: inset 0 0 30px rgba(0,0,0,0.9);
          background: #0c0d19;
          aspect-ratio: 480 / 600;
        }

        .game-canvas {
          display: block;
          width: 100%;
          height: auto;
        }

        .overlay-screen {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(12, 13, 25, 0.85);
          backdrop-filter: blur(4px);
          z-index: 10;
          padding: 2rem;
          text-align: center;
        }

        .overlay-title {
          font-size: 2.5rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #00f0ff, #ff007f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }

        .overlay-subtitle {
          font-size: 0.95rem;
          opacity: 0.75;
          margin-bottom: 2rem;
          max-width: 320px;
          line-height: 1.5;
        }

        .cyber-button {
          position: relative;
          background: linear-gradient(135deg, #00f0ff, #7f00ff);
          border: none;
          color: white;
          padding: 10px 28px;
          font-size: 1.1rem;
          font-weight: 800;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-shadow: 0 1px 3px rgba(0,0,0,0.4);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.35);
        }

        .cyber-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.6);
        }

        .cyber-button:active {
          transform: translateY(1px);
        }

        .score-hud {
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 2.2rem;
          font-weight: 900;
          color: #ffffff;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.6);
          font-family: monospace;
          z-index: 5;
        }

        .powerup-indicators {
          position: absolute;
          bottom: 15px;
          left: 15px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 5;
        }

        .hud-bar-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(12, 13, 25, 0.75);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1.5px solid rgba(255,255,255,0.08);
          font-size: 0.75rem;
          font-weight: bold;
          min-width: 140px;
        }

        .hud-bar-bg {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
          overflow: hidden;
        }

        .hud-bar-fill {
          height: 100%;
          border-radius: 3px;
        }

        .settings-panel {
          flex: 1;
          min-width: 320px;
          max-width: 440px;
          background: #141526;
          border: 2px solid #1f2240;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .settings-title {
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0 0 1.2rem 0;
          border-bottom: 1.5px solid #1f2240;
          padding-bottom: 0.6rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .settings-title span {
          background: linear-gradient(135deg, #00f0ff, #ff007f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .setting-row {
          margin-bottom: 1.25rem;
        }

        .setting-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .difficulty-group {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          background: rgba(0,0,0,0.25);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .difficulty-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: bold;
          padding: 8px 0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .difficulty-btn--active {
          background: #1f2240;
          color: #00f0ff;
          box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
        }

        .skins-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .skin-card {
          border: 1.5px solid #222543;
          background: rgba(0,0,0,0.15);
          border-radius: 8px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .skin-card:hover {
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.02);
        }

        .skin-card--active {
          border-color: var(--skin-color);
          box-shadow: inset 0 0 8px var(--skin-glow);
          background: rgba(var(--skin-color-rgb), 0.04);
        }

        .skin-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 0.85rem;
        }

        .skin-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 6px var(--skin-color);
        }

        .skin-desc {
          font-size: 0.72rem;
          opacity: 0.65;
          line-height: 1.3;
        }

        .powerup-guide {
          border-top: 1.5px solid #1f2240;
          margin-top: 1.5rem;
          padding-top: 1rem;
        }

        .guide-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 0.8rem;
          font-size: 0.78rem;
          line-height: 1.4;
        }

        .guide-badge {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.65rem;
          flex-shrink: 0;
          box-shadow: 0 0 6px currentColor;
        }

        .guide-text {
          opacity: 0.8;
        }

        .tap-reminder {
          font-size: 0.75rem;
          opacity: 0.5;
          margin-top: 0.6rem;
        }

        .reset-btn {
          background: transparent;
          border: 1px solid #ff007f33;
          color: #ff007f99;
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .reset-btn:hover {
          background: #ff007f15;
          color: #ff007fff;
          border-color: #ff007fff;
        }
      ` }} />

      {/* 1. Arcade Cabinet Wrapper */}
      <div className="arcade-cabinet">
        <div className="arcade-screen">
          
          {/* HUD for Scores */}
          {gameState === "playing" && (
            <div className="score-hud">{score}</div>
          )}

          {/* Active Powerup Indicators HUD */}
          {gameState === "playing" && (
            <div className="powerup-indicators">
              {activeShield && (
                <div className="hud-bar-container" style={{ color: "#00f0ff" }}>
                  <span>🛡️</span>
                  <span>{isZh ? "护盾激活" : "SHIELD"}</span>
                  <div className="hud-bar-bg">
                    <div className="hud-bar-fill" style={{ width: "100%", backgroundColor: "#00f0ff" }}></div>
                  </div>
                </div>
              )}
              {slowmoTime > 0 && (
                <div className="hud-bar-container" style={{ color: "#c040ff" }}>
                  <span>⏳</span>
                  <span>{isZh ? "时空减速" : "SLOW-MO"}</span>
                  <div className="hud-bar-bg">
                    <div className="hud-bar-fill" style={{ 
                      width: `${(slowmoTime / 6000) * 100}%`, 
                      backgroundColor: "#c040ff" 
                    }}></div>
                  </div>
                </div>
              )}
              {boostTime > 0 && (
                <div className="hud-bar-container" style={{ color: "#ffea00" }}>
                  <span>⚡</span>
                  <span>{isZh ? "超音速冲刺" : "SONIC BOOST"}</span>
                  <div className="hud-bar-bg">
                    <div className="hud-bar-fill" style={{ 
                      width: `${(boostTime / 3500) * 100}%`, 
                      backgroundColor: "#ffea00" 
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CANVAS BOARD */}
          <canvas
            ref={canvasRef}
            width={480}
            height={600}
            className="game-canvas"
            onClick={triggerFlap}
          />

          {/* OVERLAY: START MENU */}
          {gameState === "menu" && (
            <div className="overlay-screen">
              <h1 className="overlay-title">Cyber Flyer</h1>
              <p className="overlay-subtitle">
                {isZh
                  ? "驾驶赛博穿梭机，在霓虹太空柱群中冲刺。避开障碍物并拾取强大的推进道具！"
                  : "Pilot your cyber jet through columns of neon obstacles. Avoid crashing and collect powerful space mods!"}
              </p>
              <button className="cyber-button" onClick={startGame}>
                {isZh ? "启动飞越" : "LAUNCH JET"}
              </button>
              <div className="tap-reminder">
                {isZh ? "支持空格键或直接点击画面飞行" : "Press SPACE BAR or Tap Screen to fly"}
              </div>
            </div>
          )}

          {/* OVERLAY: GAME OVER */}
          {gameState === "gameover" && (
            <div className="overlay-screen">
              <h1 className="overlay-title" style={{ color: "#ff007f", textShadow: "0 0 15px rgba(255,0,127,0.4)" }}>
                {isZh ? "任务失败" : "CRITICAL FAILURE"}
              </h1>
              <div style={{ marginBottom: "2rem" }}>
                <p style={{ margin: "0.2rem 0", fontSize: "1.1rem" }}>
                  {isZh ? "本次积分：" : "Final Score: "}
                  <strong style={{ color: "#00f0ff", fontSize: "1.4rem" }}>{score}</strong>
                </p>
                <p style={{ margin: "0.2rem 0", opacity: 0.7, fontSize: "0.9rem" }}>
                  {isZh ? "最高记录：" : "Personal Record: "}
                  <strong>{highScore}</strong>
                </p>
              </div>
              <button className="cyber-button" onClick={startGame}>
                {isZh ? "重新点火" : "REDEPLOY JET"}
              </button>
              <div className="tap-reminder">
                {isZh ? "支持空格键重新开始" : "Press SPACE BAR to try again"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Side Settings Panel */}
      <div className="settings-panel">
        <h2 className="settings-title">
          <span>{isZh ? "飞越控制台" : "CONTROL PANEL"}</span>
          <button 
            className="reset-btn"
            onClick={() => {
              if (confirm(isZh ? "确定要清空最高分记录吗？" : "Are you sure you want to reset your high score?")) {
                setHighScore(0);
                localStorage.removeItem("tool-platform:cyber-flyer:highscore");
              }
            }}
          >
            {isZh ? "重置纪录" : "Reset Record"}
          </button>
        </h2>

        {/* Difficulty Selection */}
        <div className="setting-row">
          <label className="setting-label">{isZh ? "空间流速 / 难度" : "Speed & Difficulty"}</label>
          <div className="difficulty-group">
            <button
              className={`difficulty-btn ${difficulty === "easy" ? "difficulty-btn--active" : ""}`}
              onClick={() => setDifficulty("easy")}
            >
              {isZh ? "休闲 (Easy)" : "Easy"}
            </button>
            <button
              className={`difficulty-btn ${difficulty === "medium" ? "difficulty-btn--active" : ""}`}
              onClick={() => setDifficulty("medium")}
            >
              {isZh ? "脉冲 (Medium)" : "Medium"}
            </button>
            <button
              className={`difficulty-btn ${difficulty === "hard" ? "difficulty-btn--active" : ""}`}
              onClick={() => setDifficulty("hard")}
            >
              {isZh ? "超载 (Hard)" : "Hard"}
            </button>
          </div>
        </div>

        {/* Skin Selection */}
        <div className="setting-row">
          <label className="setting-label">{isZh ? "飞梭外观与涂装" : "Jet Skins & Paints"}</label>
          <div className="skins-grid">
            {SKINS.map((skin) => {
              // Convert hex to rgb for conditional glow colors
              const hex = skin.color.replace("#", "");
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const rgb = `${r}, ${g}, ${b}`;

              return (
                <div
                  key={skin.id}
                  className={`skin-card ${selectedSkinId === skin.id ? "skin-card--active" : ""}`}
                  style={{
                    ["--skin-color" as any]: skin.color,
                    ["--skin-glow" as any]: skin.glow,
                    ["--skin-color-rgb" as any]: rgb
                  }}
                  onClick={() => setSelectedSkinId(skin.id)}
                >
                  <div className="skin-header">
                    <span className="skin-dot" style={{ backgroundColor: skin.color }} />
                    <span>{isZh ? skin.name : skin.nameEn}</span>
                  </div>
                  <span className="skin-desc">{isZh ? skin.description : skin.descriptionEn}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="setting-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1f2240", paddingTop: "1rem", marginTop: "1rem" }}>
          <label className="setting-label" style={{ margin: 0 }}>{isZh ? "街机合成器音效" : "Synth Audio FX"}</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>

        {/* Powerups Guide */}
        <div className="powerup-guide">
          <label className="setting-label">{isZh ? "太空推进模组指南" : "Space Mods System"}</label>
          
          <div className="guide-item">
            <span className="guide-badge" style={{ backgroundColor: "#00f0ff", color: "#141526" }}>🛡️</span>
            <div className="guide-text">
              <strong>{isZh ? "防撞防护罩 (Shield)" : "Deflect Shield"}</strong> —{" "}
              {isZh ? "抵御一次致命的撞击。多层护盾不可叠加。" : "Protects from a single collision. Does not stack."}
            </div>
          </div>

          <div className="guide-item">
            <span className="guide-badge" style={{ backgroundColor: "#c040ff", color: "#141526" }}>⏳</span>
            <div className="guide-text">
              <strong>{isZh ? "时空减速力场 (Slow-Mo)" : "Time-Warp Engine"}</strong> —{" "}
              {isZh ? "时空流速减半 6 秒，飞跃节奏变得缓和可控。" : "Slows down time rate by 50% for 6s for precise piloting."}
            </div>
          </div>

          <div className="guide-item">
            <span className="guide-badge" style={{ backgroundColor: "#ffea00", color: "#141526" }}>⚡</span>
            <div className="guide-text">
              <strong>{isZh ? "超音速冲刺 (Sonic Boost)" : "Sonic Boost Mode"}</strong> —{" "}
              {isZh ? "获得 3.5 秒超音速冲刺。期间处于无敌状态，能自动摧毁行进路上的霓虹太空柱！" : "Gain 3.5s supersonic cruise. Indestructible, auto-smashes columns in path."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
