"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// --- GAME CONFIGS & TYPES ---

type GameId =
  | "flappy"
  | "catcher"
  | "mole"
  | "shooter"
  | "klotski"
  | "puzzle"
  | "bubble"
  | "match3"
  | "zuma"
  | "pacman"
  | "snake"
  | "pong"
  | "game2048"
  | "gobang";

interface HighScores {
  flappy: number;
  catcher: number;
  mole: number;
  shooter: number;
  puzzle: number;
  bubble: number;
  match3: number;
  zuma: number;
  pacman: number;
  snake: number;
  pong: number;
  game2048: number;
  gobang: number;
}

// Lazy Audio Context creator helper
let audioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// --- PROCEDURAL AUDIO GENERATION ---
const playSound = {
  jump: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  },
  coin: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  },
  laser: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);
    
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  },
  explosion: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Synthesize explosive noise
    const bufferSize = ctx.sampleRate * 0.45;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(350, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  },
  whack: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  },
  slide: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },
  match: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    gain.connect(ctx.destination);

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
      
      const oGain = ctx.createGain();
      oGain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.06);
      oGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.2);
      
      osc.connect(oGain);
      oGain.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + idx * 0.06 + 0.2);
    });
  },
  insertCoin: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
};

// --- GAME SPECIFIC DECLARATIONS ---

// 1. FLAPPY BIRD PIPES
interface FlappyPipe {
  x: number;
  top: number;
  bottom: number;
  passed: boolean;
}

// 2. COIN CATCHER ITEM
interface FallingCoin {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: "gold" | "diamond" | "bomb";
  radius: number;
}

// 3. SPACE INVASION ITEMS
interface Laser {
  x: number;
  y: number;
}
interface SpaceEnemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  type: "normal" | "elite" | "boss";
  hp: number;
  scoreVal: number;
  radius: number;
}
interface LaserExplosion {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// 4. KLOTSKI PIECE
interface KlotskiPiece {
  id: string;
  name: string;
  x: number; // 0..3 cols
  y: number; // 0..4 rows
  w: number; // grid units
  h: number;
  color: string;
}

// 5. SLIDING PUZZLE
interface SlidingPuzzleTile {
  index: number; // current visual position
  value: number; // 1-8, 0 for empty
}

// 6. BUBBLE SHOOTER BUBBLES
interface ShootBubble {
  x: number;
  y: number;
  color: string;
}
interface ProjectileBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

// 7. MATCH-3 BLITZ GEMS
interface MatchGem {
  id: number;
  color: string; // "red", "yellow", "blue", "green", "purple", "cyan"
  matched: boolean;
}

// 8. ZUMA MARBLES
interface ZumaMarble {
  id: number;
  color: string;
  offset: number; // Distance along track (px)
}
interface ZumaBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

export default function RetroArcadeTool({ manifest }: ToolAppProps) {
  const [activeGame, setActiveGame] = useState<GameId>("flappy");
  
  // Stats
  const [scores, setScores] = useState<HighScores>({
    flappy: 0,
    catcher: 0,
    mole: 0,
    shooter: 0,
    puzzle: 0,
    bubble: 0,
    match3: 0,
    zuma: 0,
    pacman: 0,
    snake: 0,
    pong: 0,
    game2048: 0,
    gobang: 0
  });
  const [totalCoins, setTotalCoins] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load scores
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedScores = localStorage.getItem("retro_arcade_scores");
      if (savedScores) {
        try {
          setScores(JSON.parse(savedScores));
        } catch (_) {}
      }
      const savedCoins = localStorage.getItem("retro_arcade_coins");
      if (savedCoins) {
        setTotalCoins(parseInt(savedCoins) || 0);
      }
    }
  }, []);

  const saveScores = (newScores: HighScores) => {
    setScores(newScores);
    localStorage.setItem("retro_arcade_scores", JSON.stringify(newScores));
  };

  const addCoins = (amt: number) => {
    setTotalCoins((prev) => {
      const next = prev + amt;
      localStorage.setItem("retro_arcade_coins", next.toString());
      return next;
    });
  };

  // Play retro chime on command sound
  const handleSoundTrigger = (name: keyof typeof playSound) => {
    if (soundEnabled) {
      playSound[name]();
    }
  };

  // Insert virtual arcade coin
  const handleInsertCoin = () => {
    handleSoundTrigger("insertCoin");
    addCoins(10);
  };

  return (
    <section className="tool-panel">
      {/* Stylesheet */}
      <style>{`
        .arcade-container {
          background: #0f172a;
          color: #f1f5f9;
          font-family: "Courier New", Courier, monospace;
          border-radius: var(--radius-xl);
          border: 3px solid #334155;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          user-select: none;
        }

        /* Banner Header */
        .arcade-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-bottom: 3px solid #334155;
          padding: 10px 20px;
          color: #f43f5e;
          text-shadow: 0 0 10px rgba(244, 63, 94, 0.6);
          font-weight: bold;
        }

        .arcade-header h1 {
          font-size: 1.4rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .arcade-stats-bar {
          display: flex;
          gap: 15px;
          font-size: 0.85rem;
          color: #38bdf8;
          text-shadow: 0 0 5px rgba(56, 189, 248, 0.4);
        }

        /* Main Workspace Grid */
        .arcade-cabinet {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 520px;
        }

        @media (max-width: 820px) {
          .arcade-cabinet {
            grid-template-columns: 1fr;
          }
        }

        /* Left Side: Game Select Sidebar */
        .arcade-sidebar {
          background: #0b0f19;
          border-right: 3px solid #334155;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sidebar-title {
          font-size: 0.8rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }

        .game-nav-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #1e293b !important;
          border: 1px solid #475569 !important;
          border-radius: var(--radius-md);
          color: #cbd5e1;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--duration-fast);
          text-align: left;
          transform: none !important;
          box-shadow: none !important;
        }

        .game-nav-btn:hover {
          border-color: #f43f5e !important;
          color: #fff;
          box-shadow: 0 0 10px rgba(244, 63, 94, 0.3) !important;
        }

        .game-nav-btn.active {
          background: linear-gradient(135deg, #f43f5e 0%, #be185d 100%) !important;
          border-color: #fb7185 !important;
          color: #fff;
          font-weight: bold;
          box-shadow: 0 0 12px rgba(244, 63, 94, 0.5) !important;
        }

        .high-score-badge {
          font-size: 0.7rem;
          opacity: 0.85;
          background: rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Right Side: Arcade Screen Container */
        .arcade-screen-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          background: radial-gradient(circle at center, #111827 0%, #030712 100%);
        }

        /* CRT Arcade Screen Warp and Scanlines */
        .crt-screen {
          position: relative;
          width: 100%;
          max-width: 480px;
          height: 400px;
          background: #000;
          border: 8px solid #475569;
          border-radius: var(--radius-lg);
          box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.9), 0 0 20px rgba(94, 234, 212, 0.15);
          overflow: hidden;
        }

        .crt-screen::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          z-index: 100;
          background-size: 100% 4px, 6px 100%;
          pointer-events: none;
        }

        /* CRT Phosphor Scanline Overlay Animation */
        .scanlines {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(rgba(255, 255, 255, 0.03) 50%, rgba(0, 0, 0, 0.15) 50%);
          background-size: 100% 3px;
          pointer-events: none;
          z-index: 99;
        }

        /* Virtual Arcade Controls Footer */
        .arcade-virtual-deck {
          display: flex;
          justify-content: space-around;
          align-items: center;
          width: 100%;
          max-width: 480px;
          margin-top: 15px;
          padding: 10px;
          background: #1e293b;
          border: 2px solid #334155;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        .deck-joystick {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #475569;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .deck-joystick-knob {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #f43f5e;
          box-shadow: 0 0 10px #f43f5e;
          cursor: pointer;
        }

        .deck-buttons {
          display: flex;
          gap: 12px;
        }

        .deck-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2) !important;
          color: #fff;
          font-weight: bold;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: none !important;
          box-shadow: none !important;
        }

        .deck-btn-a {
          background: #10b981 !important; /* Green A button */
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.6) !important;
        }

        .deck-btn-b {
          background: #3b82f6 !important; /* Blue B button */
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.6) !important;
        }

        .deck-coin {
          padding: 6px 14px;
          background: #eab308 !important; /* Gold coin insert button */
          border: 1px solid #ca8a04 !important;
          border-radius: var(--radius-md);
          color: #111827;
          font-size: 0.75rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.5) !important;
          transform: none !important;
        }

        /* Game Screens Inner Layouts */
        .game-overlay-screen {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          z-index: 10;
          padding: 20px;
          text-align: center;
        }

        .retro-title {
          font-size: 1.6rem;
          color: #38bdf8;
          text-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
          margin-bottom: 15px;
        }

        .retro-score-lbl {
          font-size: 1.1rem;
          color: #10b981;
          margin-bottom: 25px;
        }

        .retro-btn {
          padding: 10px 24px;
          background: linear-gradient(180deg, #f43f5e 0%, #be185d 100%) !important;
          border: 2px solid #fb7185 !important;
          border-radius: var(--radius-md);
          color: #fff;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(244, 63, 94, 0.5) !important;
        }

        /* --- GAME-SPECIFIC CSS RULES --- */

        /* 3. Whack-A-Mole Grid */
        .mole-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 15px;
          width: 90%;
          height: 90%;
          margin: auto;
          align-content: center;
        }

        .mole-hole {
          background: #1e293b;
          border: 3px solid #475569;
          border-radius: 50%;
          height: 90px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 6px 15px rgba(0,0,0,0.8);
        }

        .mole-character {
          position: absolute;
          bottom: -70px;
          left: 50%;
          transform: translateX(-50%);
          width: 55px;
          height: 55px;
          border-radius: 50% 50% 10px 10px;
          transition: bottom 0.15s ease-out;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mole-character.up {
          bottom: 10px;
        }

        .mole-char-normal { background: #b45309; border: 2.5px solid #d97706; }
        .mole-char-gold { background: #ca8a04; border: 2.5px solid #facc15; box-shadow: 0 0 12px #facc15; }
        .mole-char-bomb { background: #ef4444; border: 2.5px solid #f87171; box-shadow: 0 0 12px #f87171; }

        .mole-spectacles {
          width: 32px;
          height: 12px;
          background: #000;
          border-radius: 3px;
          position: relative;
          top: -4px;
        }

        /* 5. Klotski Puzzle Board */
        .klotski-board {
          width: 320px;
          height: 400px;
          background: #0f172a;
          border: 4px solid #334155;
          position: relative;
          margin: auto;
        }

        .klotski-piece {
          position: absolute;
          border-radius: var(--radius-sm);
          border: 2px solid rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 0.75rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: inset 0 2px 6px rgba(255,255,255,0.3);
        }

        .klotski-piece-arrows {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.45);
          border-radius: var(--radius-sm);
          z-index: 5;
          gap: 6px;
        }

        .klotski-arrow-btn {
          width: 26px;
          height: 26px;
          background: #f43f5e;
          border: 1px solid #fff;
          color: #fff;
          font-size: 0.8rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* 6. Sliding Puzzle Grid */
        .sliding-puzzle-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 300px;
          height: 300px;
          margin: 30px auto;
        }

        .puzzle-tile {
          background: #1e293b;
          border: 2px solid #06b6d4;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
          border-radius: var(--radius-md);
          color: #22d3ee;
          font-size: 1.6rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .puzzle-tile.empty {
          background: transparent;
          border: 1px dashed #334155;
          box-shadow: none;
          cursor: default;
        }

        /* 8. Match-3 Blitz Board */
        .match3-board {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(8, 1fr);
          gap: 4px;
          width: 340px;
          height: 340px;
          margin: 15px auto;
          background: rgba(15, 23, 42, 0.8);
          border: 3px solid #334155;
          padding: 4px;
          border-radius: var(--radius-lg);
        }

        .match3-gem {
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s ease;
          border: 1.5px solid rgba(0,0,0,0.15);
        }

        .match3-gem.selected {
          transform: scale(0.9);
          border-color: #fff;
          box-shadow: 0 0 10px #fff, 0 0 18px currentColor;
        }

        .gem-svg-icon {
          width: 80%;
          height: 80%;
        }

      `}</style>

      <div className="arcade-container">
        {/* Banner Header */}
        <div className="arcade-header">
          <h1>
            🕹️ 赛博街机模拟器 <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Arcade Center</span>
          </h1>
          <div className="arcade-stats-bar">
            <span>🪙 币值储备: {totalCoins}</span>
            <span>🔊 声音: <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ padding: "2px 8px", background: "#334155", color: "#fff", border: "none", borderRadius: "4px" }}>{soundEnabled ? "开" : "关"}</button></span>
          </div>
        </div>

        {/* Cabinet Workspace */}
        <div className="arcade-cabinet">
          {/* Left Navigation: Games select */}
          <div className="arcade-sidebar">
            <div className="sidebar-title">经典街机游戏</div>
            <button
              onClick={() => { setActiveGame("flappy"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "flappy" ? "active" : ""}`}
            >
              <span>🦅 飞越霓虹</span>
              <span className="high-score-badge">👑 {scores.flappy}</span>
            </button>
            <button
              onClick={() => { setActiveGame("catcher"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "catcher" ? "active" : ""}`}
            >
              <span>🧺 金币狂雨</span>
              <span className="high-score-badge">👑 {scores.catcher}</span>
            </button>
            <button
              onClick={() => { setActiveGame("mole"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "mole" ? "active" : ""}`}
            >
              <span>🔨 地鼠危机</span>
              <span className="high-score-badge">👑 {scores.mole}</span>
            </button>
            <button
              onClick={() => { setActiveGame("shooter"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "shooter" ? "active" : ""}`}
            >
              <span>🚀 星际防线</span>
              <span className="high-score-badge">👑 {scores.shooter}</span>
            </button>

            <div className="sidebar-title" style={{ marginTop: "15px" }}>复古益智棋牌</div>
            <button
              onClick={() => { setActiveGame("klotski"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "klotski" ? "active" : ""}`}
            >
              <span>🚩 古道突围 (华容道)</span>
              <span className="high-score-badge">解密</span>
            </button>
            <button
              onClick={() => { setActiveGame("puzzle"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "puzzle" ? "active" : ""}`}
            >
              <span>🧩 九宫魔方 (拼图)</span>
              <span className="high-score-badge">👑 {scores.puzzle}</span>
            </button>
            <button
              onClick={() => { setActiveGame("bubble"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "bubble" ? "active" : ""}`}
            >
              <span>🔮 泡泡大作战</span>
              <span className="high-score-badge">👑 {scores.bubble}</span>
            </button>
            <button
              onClick={() => { setActiveGame("match3"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "match3" ? "active" : ""}`}
            >
              <span>💎 宝石消消乐</span>
              <span className="high-score-badge">👑 {scores.match3}</span>
            </button>
            <button
              onClick={() => { setActiveGame("zuma"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "zuma" ? "active" : ""}`}
            >
              <span>🐸 祖玛神像</span>
              <span className="high-score-badge">👑 {scores.zuma}</span>
            </button>
            <button
              onClick={() => { setActiveGame("pacman"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "pacman" ? "active" : ""}`}
            >
              <span>🍕 霓虹吃豆人</span>
              <span className="high-score-badge">👑 {scores.pacman}</span>
            </button>
            <button
              onClick={() => { setActiveGame("snake"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "snake" ? "active" : ""}`}
            >
              <span>🐍 霓虹贪吃蛇</span>
              <span className="high-score-badge">👑 {scores.snake}</span>
            </button>
            <button
              onClick={() => { setActiveGame("pong"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "pong" ? "active" : ""}`}
            >
              <span>🏓 弹球大对战</span>
              <span className="high-score-badge">👑 {scores.pong}</span>
            </button>
            <button
              onClick={() => { setActiveGame("game2048"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "game2048" ? "active" : ""}`}
            >
              <span>🔢 霓虹 2048</span>
              <span className="high-score-badge">👑 {scores.game2048}</span>
            </button>
            <button
              onClick={() => { setActiveGame("gobang"); handleSoundTrigger("insertCoin"); }}
              className={`game-nav-btn ${activeGame === "gobang" ? "active" : ""}`}
            >
              <span>⚫ 棋魂五子棋</span>
              <span className="high-score-badge">👑 {scores.gobang}</span>
            </button>
          </div>

          {/* Right Area: Main CRT Monitor Panel */}
          <div className="arcade-screen-area">
            <div className="crt-screen">
              <div className="scanlines"></div>

              {/* RENDER THE GAME CORRESPONDING TO ACTIVE STATE */}
              {activeGame === "flappy" && <FlappyBirdGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "catcher" && <CoinCatcherGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "mole" && <WhackAMoleGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "shooter" && <SpaceShooterGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "klotski" && <KlotskiGame triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "puzzle" && <SlidingPuzzleGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "bubble" && <BubbleShooterGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "match3" && <Match3Game scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "zuma" && <ZumaGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "pacman" && <PacmanGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "snake" && <SnakeGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "pong" && <PongGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "game2048" && <Game2048Game scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
              {activeGame === "gobang" && <GobangGame scores={scores} saveScores={saveScores} triggerSound={handleSoundTrigger} addCoins={addCoins} />}
            </div>

            {/* Virtual Retro Arcade Cabinet Deck Console */}
            <div className="arcade-virtual-deck">
              <div className="deck-joystick">
                <div className="deck-joystick-knob"></div>
              </div>
              <button className="deck-coin" onClick={handleInsertCoin}>🪙 投币 +10金币</button>
              <div className="deck-buttons">
                <div className="deck-btn deck-btn-a">A</div>
                <div className="deck-btn deck-btn-b">B</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 1. FLAPPY BIRD GAME WORKSPACE (Canvas-based)
// ==========================================
function FlappyBirdGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);

  const stateRef = useRef({
    birdY: 180,
    birdVelocity: 0,
    pipes: [] as FlappyPipe[],
    score: 0,
    frame: 0
  });

  const jump = () => {
    stateRef.current.birdVelocity = -4.5;
    triggerSound("jump");
  };

  // Keyboard handle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "playing") {
          jump();
        } else if (gameState === "idle") {
          startGame();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    stateRef.current = {
      birdY: 180,
      birdVelocity: 0,
      pipes: [
        { x: 300, top: 120, bottom: 220, passed: false },
        { x: 480, top: 80, bottom: 200, passed: false }
      ],
      score: 0,
      frame: 0
    };
    setScore(0);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // Physics
      state.birdVelocity += 0.22; // gravity
      state.birdY += state.birdVelocity;

      // Move pipes
      state.pipes.forEach((pipe) => {
        pipe.x -= 1.8;
      });

      // Spawn pipes
      if (state.pipes.length > 0 && state.pipes[state.pipes.length - 1].x < 320) {
        const topH = 40 + Math.random() * 160;
        const gap = 90 + Math.random() * 20;
        state.pipes.push({
          x: 480,
          top: topH,
          bottom: topH + gap,
          passed: false
        });
      }

      // Remove offscreen pipes & count scores
      state.pipes = state.pipes.filter((pipe) => {
        if (pipe.x < -40) return false;
        if (!pipe.passed && pipe.x < 100) {
          pipe.passed = true;
          state.score += 1;
          setScore(state.score);
          triggerSound("coin");
        }
        return true;
      });

      // Collision checks
      let hit = false;
      if (state.birdY < 0 || state.birdY > 390) {
        hit = true;
      }

      state.pipes.forEach((pipe) => {
        if (pipe.x < 118 && pipe.x > 62) {
          // Inside horizontal bounds of pipe
          if (state.birdY < pipe.top || state.birdY > pipe.bottom) {
            hit = true;
          }
        }
      });

      if (hit) {
        triggerSound("explosion");
        setGameState("gameover");
        // Update highscore
        if (state.score > scores.flappy) {
          saveScores({ ...scores, flappy: state.score });
        }
        // Give tickets
        addCoins(Math.floor(state.score / 2));
        return;
      }

      // Drawing
      ctx.clearRect(0, 0, 480, 400);

      // Starfield Background
      ctx.fillStyle = "#0c1524";
      ctx.fillRect(0, 0, 480, 400);

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 20; i++) {
        const starX = (Math.sin(i * 123 + state.frame * 0.05) * 240 + 240);
        const starY = (Math.cos(i * 456) * 200 + 200);
        ctx.fillRect(starX, starY, 2, 2);
      }

      // Draw Pipes
      state.pipes.forEach((pipe) => {
        // Neon green fill
        ctx.fillStyle = "#10b981";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 10;

        // Top pipe
        ctx.fillRect(pipe.x, 0, 40, pipe.top);
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottom, 40, 400 - pipe.bottom);

        // resets
        ctx.shadowBlur = 0;
      });

      // Draw Bird
      ctx.beginPath();
      ctx.arc(100, state.birdY, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw eye
      ctx.beginPath();
      ctx.arc(104, state.birdY - 3, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();

      // Wing flap
      ctx.beginPath();
      ctx.ellipse(94, state.birdY + 2, 6, Math.abs(Math.sin(state.frame * 0.4) * 4) + 1, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#eab308";
      ctx.fill();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        onClick={() => {
          if (gameState === "playing") jump();
        }}
        style={{ display: "block", cursor: gameState === "playing" ? "pointer" : "default" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🦅 飞越霓虹</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            按空格键或点击屏幕跳跃飞行，在霓虹管的狭缝间穿梭挑战高分。
          </p>
          <button className="retro-btn" onClick={startGame}>启动街机 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">本轮得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新开始 / CONTINUE</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, fontSize: "1.3rem", fontWeight: "bold", color: "#10b981", textShadow: "0 0 5px #10b981" }}>
          得分: {score}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. COIN CATCHER GAME (Canvas-based)
// ==========================================
function CoinCatcherGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);

  const stateRef = useRef({
    basketX: 200,
    basketWidth: 80,
    coins: [] as FallingCoin[],
    score: 0,
    lives: 3,
    coinIdCounter: 0,
    frame: 0
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    stateRef.current.basketX = Math.max(0, Math.min(480 - stateRef.current.basketWidth, x - stateRef.current.basketWidth / 2));
  };

  // Keyboard handle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.code === "ArrowLeft") {
        stateRef.current.basketX = Math.max(0, stateRef.current.basketX - 25);
      } else if (e.code === "ArrowRight") {
        stateRef.current.basketX = Math.min(400, stateRef.current.basketX + 25);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    stateRef.current = {
      basketX: 200,
      basketWidth: 80,
      coins: [],
      score: 0,
      lives: 3,
      coinIdCounter: 0,
      frame: 0
    };
    setScore(0);
    setLives(3);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // Spawn coins
      if (state.frame % 30 === 0) {
        const rand = Math.random();
        let type: "gold" | "diamond" | "bomb" = "gold";
        let r = 10;
        let speed = 2.2 + Math.random() * 2;
        if (rand < 0.15) {
          type = "diamond";
          r = 8;
          speed = 3.5 + Math.random() * 1.5;
        } else if (rand < 0.35) {
          type = "bomb";
          r = 12;
          speed = 2.0 + Math.random() * 1.5;
        }

        state.coins.push({
          id: state.coinIdCounter++,
          x: 20 + Math.random() * 440,
          y: -20,
          speed,
          type,
          radius: r
        });
      }

      // Move coins
      state.coins.forEach((coin) => {
        coin.y += coin.speed;
      });

      // Catch and collision logic
      state.coins = state.coins.filter((coin) => {
        // Check collision with basket at y = 370
        if (coin.y >= 355 && coin.y <= 380) {
          if (coin.x >= state.basketX - 10 && coin.x <= state.basketX + state.basketWidth + 10) {
            // Caught!
            if (coin.type === "gold") {
              state.score += 10;
              triggerSound("coin");
            } else if (coin.type === "diamond") {
              state.score += 30;
              triggerSound("match");
            } else if (coin.type === "bomb") {
              state.score = Math.max(0, state.score - 20);
              state.lives -= 1;
              triggerSound("explosion");
            }
            setScore(state.score);
            setLives(state.lives);
            return false; // remove
          }
        }

        // Hit floor
        if (coin.y > 410) {
          if (coin.type === "gold") {
            state.lives -= 1;
            setLives(state.lives);
            triggerSound("whack");
          }
          return false;
        }

        return true;
      });

      // Check lives
      if (state.lives <= 0) {
        setGameState("gameover");
        if (state.score > scores.catcher) {
          saveScores({ ...scores, catcher: state.score });
        }
        addCoins(Math.floor(state.score / 10));
        return;
      }

      // Draw
      ctx.clearRect(0, 0, 480, 400);

      // Deep arcade ocean background
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, 480, 400);

      // Grid helper lines
      ctx.strokeStyle = "rgba(51, 65, 85, 0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 480; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 400);
        ctx.stroke();
      }

      // Draw basket
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.fillRect(state.basketX, 370, state.basketWidth, 12);
      ctx.fillRect(state.basketX + 5, 362, 8, 8);
      ctx.fillRect(state.basketX + state.basketWidth - 13, 362, 8, 8);
      ctx.shadowBlur = 0;

      // Draw coins
      state.coins.forEach((coin) => {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);

        if (coin.type === "gold") {
          ctx.fillStyle = "#facc15";
          ctx.shadowColor = "#facc15";
          ctx.shadowBlur = 8;
          ctx.fill();
        } else if (coin.type === "diamond") {
          ctx.fillStyle = "#22d3ee";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 12;
          ctx.fill();
        } else {
          ctx.fillStyle = "#ef4444";
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 8;
          ctx.fill();
          // bomb fuse details
          ctx.beginPath();
          ctx.moveTo(coin.x, coin.y - 10);
          ctx.lineTo(coin.x + 5, coin.y - 15);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        onMouseMove={handleMouseMove}
        style={{ display: "block" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🧺 金币狂雨</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            滑动鼠标或使用左右方向键移动底部接板，接住掉落的黄金和钻石，小心避开红色炸弹！
          </p>
          <button className="retro-btn" onClick={startGame}>开始接币 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">捕获积分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新再战 / RESET</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, right: 20, display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "bold", zIndex: 5 }}>
          <span style={{ color: "#facc15", textShadow: "0 0 5px #facc15" }}>积分: {score}</span>
          <span style={{ color: "#ef4444", textShadow: "0 0 5px #ef4444" }}>生命值: {"❤️".repeat(lives)}</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. WHACK-A-MOLE GAME (DOM/Grid-based)
// ==========================================
function WhackAMoleGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [moles, setMoles] = useState<("none" | "normal" | "gold" | "bomb")[]>(Array(9).fill("none"));

  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moleSpawnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setMoles(Array(9).fill("none"));
    setGameState("playing");
  };

  // Main countdown timer
  useEffect(() => {
    if (gameState !== "playing") return;

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(gameTimerRef.current!);
          setGameState("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState]);

  // Mole popup logic loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const tick = () => {
      setMoles((prev) => {
        const next = [...prev];
        // 1. Clear some moles randomly
        for (let i = 0; i < 9; i++) {
          if (next[i] !== "none" && Math.random() > 0.45) {
            next[i] = "none";
          }
        }

        // 2. Select a target empty hole
        const emptyHoles = [];
        for (let i = 0; i < 9; i++) {
          if (next[i] === "none") emptyHoles.push(i);
        }

        if (emptyHoles.length > 0) {
          const spawnCount = Math.floor(Math.random() * 2) + 1; // spawn 1 or 2
          for (let s = 0; s < spawnCount; s++) {
            if (emptyHoles.length === 0) break;
            const targetIdx = emptyHoles.splice(Math.floor(Math.random() * emptyHoles.length), 1)[0];
            const rand = Math.random();
            if (rand < 0.12) {
              next[targetIdx] = "gold";
            } else if (rand < 0.32) {
              next[targetIdx] = "bomb";
            } else {
              next[targetIdx] = "normal";
            }
          }
        }
        return next;
      });

      const nextDelay = 800 + Math.random() * 600;
      moleSpawnTimerRef.current = setTimeout(tick, nextDelay);
    };

    moleSpawnTimerRef.current = setTimeout(tick, 900);
    return () => {
      if (moleSpawnTimerRef.current) clearTimeout(moleSpawnTimerRef.current);
    };
  }, [gameState]);

  // Handle game end scores update
  useEffect(() => {
    if (gameState === "gameover") {
      if (score > scores.mole) {
        saveScores({ ...scores, mole: score });
      }
      addCoins(Math.floor(score / 8));
    }
  }, [gameState]);

  const handleWhack = (index: number) => {
    if (gameState !== "playing") return;
    const type = moles[index];
    if (type === "none") return;

    triggerSound("whack");

    // Clear mole
    setMoles((prev) => {
      const next = [...prev];
      next[index] = "none";
      return next;
    });

    if (type === "normal") {
      setScore((prev) => prev + 10);
    } else if (type === "gold") {
      setScore((prev) => prev + 30);
    } else if (type === "bomb") {
      setScore((prev) => Math.max(0, prev - 25));
      triggerSound("explosion");
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      {gameState === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", fontSize: "1.1rem", fontWeight: "bold", background: "#0b0f19", borderBottom: "2px solid #334155" }}>
          <span style={{ color: "#38bdf8" }}>锤打积分: {score}</span>
          <span style={{ color: "#f43f5e" }}>倒计时: {timeLeft}s</span>
        </div>
      )}

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🔨 地鼠危机</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            地鼠会从9个霓虹洞口不断钻出。砸中普通地鼠+10分，金色地鼠+30分，千万别碰红色炸弹地鼠！
          </p>
          <button className="retro-btn" onClick={startGame}>挑战打地鼠 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>TIME OVER</div>
          <div className="retro-score-lbl">最终积分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新装弹 / CONTINUE</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div className="mole-grid">
            {moles.map((type, idx) => (
              <div key={idx} className="mole-hole" onClick={() => handleWhack(idx)}>
                <div className={`mole-character ${type !== "none" ? "up" : ""} mole-char-${type}`}>
                  {type !== "none" && (
                    <div className="mole-spectacles">
                      <div style={{ display: "flex", justifyContent: "space-around", width: "100%", marginTop: "1px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: type === "gold" ? "#00ffff" : "#fff" }}></span>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: type === "gold" ? "#00ffff" : "#fff" }}></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. SPACE SHOOTER / INVASION GAME (Canvas-based)
// ==========================================
function SpaceShooterGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);
  const [shields, setShields] = useState<number>(3);

  const stateRef = useRef({
    playerX: 220,
    lasers: [] as Laser[],
    enemies: [] as SpaceEnemy[],
    explosions: [] as LaserExplosion[],
    score: 0,
    shields: 3,
    enemyIdCounter: 0,
    expIdCounter: 0,
    frame: 0
  });

  const jump = () => {
    // Fired from deck control buttons
    fireLaser();
  };

  const fireLaser = () => {
    const state = stateRef.current;
    state.lasers.push({
      x: state.playerX + 20, // center
      y: 350
    });
    triggerSound("laser");
  };

  // Keyboard handle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        stateRef.current.playerX = Math.max(10, stateRef.current.playerX - 25);
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        stateRef.current.playerX = Math.min(430, stateRef.current.playerX + 25);
      } else if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        fireLaser();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Handle canvas clicks to shoot as well
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    fireLaser();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    stateRef.current.playerX = Math.max(10, Math.min(430, x - 20));
  };

  const startGame = () => {
    stateRef.current = {
      playerX: 220,
      lasers: [],
      enemies: [],
      explosions: [],
      score: 0,
      shields: 3,
      enemyIdCounter: 0,
      expIdCounter: 0,
      frame: 0
    };
    setScore(0);
    setShields(3);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // 1. Move lasers
      state.lasers.forEach((laser) => {
        laser.y -= 7;
      });
      state.lasers = state.lasers.filter((laser) => laser.y > -10);

      // 2. Spawn enemies
      if (state.frame % 45 === 0) {
        const rand = Math.random();
        let type: "normal" | "elite" | "boss" = "normal";
        let hp = 1;
        let scoreVal = 10;
        let r = 12;
        let vx = (Math.random() - 0.5) * 1.5;

        if (rand < 0.12) {
          type = "boss";
          hp = 4;
          scoreVal = 50;
          r = 20;
          vx = (Math.random() - 0.5) * 2.5;
        } else if (rand < 0.35) {
          type = "elite";
          hp = 2;
          scoreVal = 25;
          r = 14;
          vx = (Math.random() - 0.5) * 2;
        }

        state.enemies.push({
          id: state.enemyIdCounter++,
          x: 40 + Math.random() * 400,
          y: -30,
          vx,
          type,
          hp,
          scoreVal,
          radius: r
        });
      }

      // 3. Move enemies
      state.enemies.forEach((enemy) => {
        enemy.y += 1.3;
        enemy.x += enemy.vx;
        // Bounce on side bounds
        if (enemy.x < enemy.radius || enemy.x > 480 - enemy.radius) {
          enemy.vx *= -1;
        }
      });

      // 4. Collision laser vs enemy
      state.lasers = state.lasers.filter((laser) => {
        let hit = false;
        state.enemies.forEach((enemy) => {
          if (!hit) {
            const dist = Math.hypot(laser.x - enemy.x, laser.y - enemy.y);
            if (dist < enemy.radius + 4) {
              hit = true;
              enemy.hp -= 1;
              
              // Sparkle puff
              state.explosions.push({
                id: state.expIdCounter++,
                x: laser.x,
                y: laser.y,
                radius: 3,
                maxRadius: 15,
                alpha: 1.0
              });

              if (enemy.hp <= 0) {
                // Slay enemy
                state.score += enemy.scoreVal;
                setScore(state.score);
                triggerSound("explosion");

                // Big blast explosion particles
                state.explosions.push({
                  id: state.expIdCounter++,
                  x: enemy.x,
                  y: enemy.y,
                  radius: 5,
                  maxRadius: enemy.radius * 2,
                  alpha: 1.0
                });
              } else {
                triggerSound("whack");
              }
            }
          }
        });
        return !hit;
      });

      // Filter dead enemies
      state.enemies = state.enemies.filter((enemy) => {
        if (enemy.hp <= 0) return false;

        // Player collision check
        const dist = Math.hypot(enemy.x - (state.playerX + 20), enemy.y - 365);
        if (dist < enemy.radius + 16) {
          // Crash!
          state.shields -= 1;
          setShields(state.shields);
          triggerSound("explosion");
          
          state.explosions.push({
            id: state.expIdCounter++,
            x: enemy.x,
            y: enemy.y,
            radius: 8,
            maxRadius: 40,
            alpha: 1.0
          });
          return false; // remove enemy
        }

        // Exit offscreen check
        if (enemy.y > 420) {
          state.shields -= 1;
          setShields(state.shields);
          triggerSound("whack");
          return false;
        }

        return true;
      });

      // 5. Update explosions
      state.explosions.forEach((exp) => {
        exp.radius += (exp.maxRadius - exp.radius) * 0.15;
        exp.alpha -= 0.05;
      });
      state.explosions = state.explosions.filter((exp) => exp.alpha > 0);

      // Check health
      if (state.shields <= 0) {
        setGameState("gameover");
        if (state.score > scores.shooter) {
          saveScores({ ...scores, shooter: state.score });
        }
        addCoins(Math.floor(state.score / 12));
        return;
      }

      // --- DRAW STAGE ---
      ctx.clearRect(0, 0, 480, 400);

      // Midnight galactic black
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, 480, 400);

      // Starfields
      ctx.fillStyle = "rgba(110, 231, 183, 0.35)"; // green neon star grid
      for (let i = 0; i < 25; i++) {
        const starX = (Math.cos(i * 12 + state.frame * 0.01) * 240 + 240);
        const starY = ((i * 18 + state.frame * 0.8) % 400);
        ctx.fillRect(starX, starY, 1.5, 1.5);
      }

      // Draw Player Fighter ship
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(state.playerX + 20, 350); // nose cone
      ctx.lineTo(state.playerX + 5, 375); // left wing tip
      ctx.lineTo(state.playerX + 15, 370);
      ctx.lineTo(state.playerX + 25, 370);
      ctx.lineTo(state.playerX + 35, 375); // right wing tip
      ctx.closePath();
      ctx.fill();

      // Wing exhausts glow
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(state.playerX + 12, 371, 4, 6 + Math.sin(state.frame * 0.8) * 3);
      ctx.fillRect(state.playerX + 24, 371, 4, 6 + Math.sin(state.frame * 0.8) * 3);
      ctx.shadowBlur = 0;

      // Draw Lasers
      ctx.fillStyle = "#facc15";
      state.lasers.forEach((laser) => {
        ctx.fillRect(laser.x - 2, laser.y, 4, 12);
      });

      // Draw Enemies
      state.enemies.forEach((enemy) => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);

        if (enemy.type === "normal") {
          ctx.fillStyle = "#a855f7"; // purple drone
          ctx.strokeStyle = "#c084fc";
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === "elite") {
          ctx.fillStyle = "#06b6d4"; // cyan cruiser
          ctx.strokeStyle = "#22d3ee";
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "#ea580c"; // orange boss saucer
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 3;
          ctx.fill();
          ctx.stroke();
          // Draw details on boss
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius / 2, 0, Math.PI);
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        }
      });

      // Draw explosions particles
      state.explosions.forEach((exp) => {
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 165, 0, ${exp.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        style={{ display: "block", cursor: "crosshair" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🚀 星际防线</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            滑动鼠标或使用左右方向键控制太空飞船，按空格键或点击屏幕发射激光，消灭入侵的外星敌机。
          </p>
          <button className="retro-btn" onClick={startGame}>架设防线 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>MISSION FAILURE</div>
          <div className="retro-score-lbl">本轮得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新武装 / RESET</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, right: 20, display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "bold", zIndex: 5 }}>
          <span style={{ color: "#a855f7", textShadow: "0 0 5px #a855f7" }}>杀敌分数: {score}</span>
          <span style={{ color: "#f43f5e", textShadow: "0 0 5px #f43f5e" }}>护盾能量: {"🛡️".repeat(shields)}</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. KLOTSKI PUZZLE GAME (Interactive Grid)
// ==========================================
function KlotskiGame({ triggerSound, addCoins }: { triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  // Pass layout dimensions: 4 columns * 5 rows. Board size 320x400 (80px per grid cell).
  const CELL = 80;

  const initialLayout: KlotskiPiece[] = [
    { id: "caocao", name: "曹操", x: 1, y: 0, w: 2, h: 2, color: "#ef4444" }, // Red Cao Cao (Red, target to get to x=1, y=3)
    { id: "guanyu", name: "关羽", x: 1, y: 2, w: 2, h: 1, color: "#10b981" }, // Green Guan Yu (Horizontal)
    { id: "zhangfei", name: "张飞", x: 0, y: 0, w: 1, h: 2, color: "#3b82f6" }, // Vertical generals
    { id: "zhaoyun", name: "赵云", x: 3, y: 0, w: 1, h: 2, color: "#3b82f6" },
    { id: "machao", name: "马超", x: 0, y: 2, w: 1, h: 2, color: "#3b82f6" },
    { id: "huangzhong", name: "黄忠", x: 3, y: 2, w: 1, h: 2, color: "#3b82f6" },
    { id: "soldier1", name: "兵", x: 1, y: 3, w: 1, h: 1, color: "#eab308" }, // 1x1 Soldiers
    { id: "soldier2", name: "兵", x: 2, y: 3, w: 1, h: 1, color: "#eab308" },
    { id: "soldier3", name: "兵", x: 0, y: 4, w: 1, h: 1, color: "#eab308" },
    { id: "soldier4", name: "兵", x: 3, y: 4, w: 1, h: 1, color: "#eab308" }
  ];

  const [pieces, setPieces] = useState<KlotskiPiece[]>(initialLayout);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [win, setWin] = useState<boolean>(false);
  const [moves, setMoves] = useState<number>(0);

  const resetGame = () => {
    setPieces(initialLayout);
    setSelectedPieceId(null);
    setWin(false);
    setMoves(0);
  };

  // Check if grid coordinates are occupied
  const getOccupiedGrid = (currentPieces: KlotskiPiece[], ignoreId: string) => {
    const grid = Array(5).fill(null).map(() => Array(4).fill(false));
    currentPieces.forEach((p) => {
      if (p.id === ignoreId) return;
      for (let r = p.y; r < p.y + p.h; r++) {
        for (let c = p.x; c < p.x + p.w; c++) {
          grid[r][c] = true;
        }
      }
    });
    return grid;
  };

  // Find valid move directions for a piece
  const getValidMoves = (piece: KlotskiPiece, currentPieces: KlotskiPiece[]) => {
    const grid = getOccupiedGrid(currentPieces, piece.id);
    const movesList: ("up" | "down" | "left" | "right")[] = [];

    // Left check
    let canMoveLeft = piece.x > 0;
    if (canMoveLeft) {
      for (let r = piece.y; r < piece.y + piece.h; r++) {
        if (grid[r][piece.x - 1]) canMoveLeft = false;
      }
    }
    if (canMoveLeft) movesList.push("left");

    // Right check
    let canMoveRight = piece.x + piece.w < 4;
    if (canMoveRight) {
      for (let r = piece.y; r < piece.y + piece.h; r++) {
        if (grid[r][piece.x + piece.w]) canMoveRight = false;
      }
    }
    if (canMoveRight) movesList.push("right");

    // Up check
    let canMoveUp = piece.y > 0;
    if (canMoveUp) {
      for (let c = piece.x; c < piece.x + piece.w; c++) {
        if (grid[piece.y - 1][c]) canMoveUp = false;
      }
    }
    if (canMoveUp) movesList.push("up");

    // Down check
    let canMoveDown = piece.y + piece.h < 5;
    if (canMoveDown) {
      for (let c = piece.x; c < piece.x + piece.w; c++) {
        if (grid[piece.y + piece.h][c]) canMoveDown = false;
      }
    }
    if (canMoveDown) movesList.push("down");

    return movesList;
  };

  const handleMove = (pieceId: string, direction: "up" | "down" | "left" | "right") => {
    setPieces((prev) => {
      const next = prev.map((p) => {
        if (p.id !== pieceId) return p;
        const updated = { ...p };
        if (direction === "left") updated.x -= 1;
        if (direction === "right") updated.x += 1;
        if (direction === "up") updated.y -= 1;
        if (direction === "down") updated.y += 1;
        return updated;
      });

      // Check win condition (Cao Cao at center bottom exit)
      const cc = next.find((p) => p.id === "caocao");
      if (cc && cc.x === 1 && cc.y === 3) {
        setWin(true);
        triggerSound("match");
        addCoins(50);
      } else {
        triggerSound("slide");
      }

      setMoves((m) => m + 1);
      return next;
    });
    setSelectedPieceId(null);
  };

  const selectedPiece = pieces.find((p) => p.id === selectedPieceId);
  const validMoves = selectedPiece ? getValidMoves(selectedPiece, pieces) : [];

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "0.85rem", color: "#64748b" }}>
        <span>步数: <b style={{ color: "#38bdf8" }}>{moves}</b></span>
        <span>目标：将曹操(红色块)移到最下方中间</span>
        <button onClick={resetGame} style={{ background: "#334155", color: "#fff", border: "none", padding: "3px 8px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>重置</button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="klotski-board">
          {/* Escape Exit indicator */}
          <div style={{ position: "absolute", bottom: -4, left: 80, width: 160, height: 8, background: "#ef4444", boxShadow: "0 0 10px #ef4444", zIndex: 1, borderRadius: "2px" }}></div>

          {pieces.map((p) => (
            <div
              key={p.id}
              className="klotski-piece"
              style={{
                left: p.x * CELL,
                top: p.y * CELL,
                width: p.w * CELL - 4,
                height: p.h * CELL - 4,
                backgroundColor: p.color,
                borderColor: selectedPieceId === p.id ? "#ffffff" : "rgba(0,0,0,0.4)"
              }}
              onClick={() => {
                if (win) return;
                setSelectedPieceId(selectedPieceId === p.id ? null : p.id);
              }}
            >
              {p.name}
              {selectedPieceId === p.id && validMoves.length > 0 && (
                <div className="klotski-piece-arrows" onClick={(e) => e.stopPropagation()}>
                  {validMoves.map((dir) => (
                    <button
                      key={dir}
                      className="klotski-arrow-btn"
                      onClick={() => handleMove(p.id, dir)}
                    >
                      {dir === "up" && "↑"}
                      {dir === "down" && "↓"}
                      {dir === "left" && "←"}
                      {dir === "right" && "→"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {win && (
            <div className="game-overlay-screen" style={{ background: "rgba(0,0,0,0.9)" }}>
              <div className="retro-title" style={{ color: "#10b981" }}>恭喜逃脱！</div>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "20px" }}>
                你用了 {moves} 步，成功护送曹操突围华容道！
              </p>
              <button className="retro-btn" onClick={resetGame}>重新挑战 / REPLAY</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. SLIDING PUZZLE GAME (DOM-based Grid)
// ==========================================
function SlidingPuzzleGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "solved">("idle");
  const [moves, setMoves] = useState<number>(0);
  const [tiles, setTiles] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 0]); // 0 represents empty space

  const scramble = () => {
    // Perform random valid slides to ensure it is solvable
    let currentTiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let emptyIndex = 8;

    for (let i = 0; i < 80; i++) {
      const row = Math.floor(emptyIndex / 3);
      const col = emptyIndex % 3;
      const neighbors = [];

      if (row > 0) neighbors.push(emptyIndex - 3); // top
      if (row < 2) neighbors.push(emptyIndex + 3); // bottom
      if (col > 0) neighbors.push(emptyIndex - 1); // left
      if (col < 2) neighbors.push(emptyIndex + 1); // right

      const nextMove = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Swap empty
      currentTiles[emptyIndex] = currentTiles[nextMove];
      currentTiles[nextMove] = 0;
      emptyIndex = nextMove;
    }

    setTiles(currentTiles);
    setMoves(0);
    setGameState("playing");
  };

  const handleTileClick = (index: number) => {
    if (gameState !== "playing") return;

    const row = Math.floor(index / 3);
    const col = index % 3;

    // Find if 0 (empty) is adjacent
    const emptyIndex = tiles.indexOf(0);
    const emptyRow = Math.floor(emptyIndex / 3);
    const emptyCol = emptyIndex % 3;

    const dist = Math.abs(row - emptyRow) + Math.abs(col - emptyCol);
    if (dist === 1) {
      // Valid swap!
      triggerSound("slide");
      const nextTiles = [...tiles];
      nextTiles[emptyIndex] = tiles[index];
      nextTiles[index] = 0;
      setTiles(nextTiles);
      setMoves((m) => m + 1);

      // Check solved
      const isSolved = nextTiles.slice(0, 8).every((val, idx) => val === idx + 1);
      if (isSolved) {
        setGameState("solved");
        triggerSound("coin");
        const reward = Math.max(5, 50 - Math.floor(moves / 3));
        addCoins(reward);

        // Update high scores (least moves is best, let's represent higher score as higher, e.g. 1000 - moves)
        const puzzleScore = Math.max(1, 1000 - moves);
        if (puzzleScore > scores.puzzle) {
          saveScores({ ...scores, puzzle: puzzleScore });
        }
      }
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 15px", fontSize: "0.85rem", color: "#64748b" }}>
        <span>滑动步数: <b style={{ color: "#06b6d4" }}>{moves}</b></span>
        <span>将数字 1 至 8 按顺序复原</span>
        <button onClick={scramble} style={{ background: "#334155", color: "#fff", border: "none", padding: "3px 8px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>重新打乱</button>
      </div>

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🧩 九宫魔方 (拼图)</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            点击与空白格相邻的数字方块进行移动，以最少的步数将数字 1 至 8 从左到右、从上到下排列复原。
          </p>
          <button className="retro-btn" onClick={scramble}>打乱并开始 / PLAY</button>
        </div>
      )}

      {gameState === "solved" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#10b981" }}>PUZZLE SOLVED!</div>
          <div className="retro-score-lbl">花费步数: {moves}</div>
          <button className="retro-btn" onClick={scramble}>再来一局 / START AGAIN</button>
        </div>
      )}

      {(gameState === "playing" || gameState === "solved") && (
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div className="sliding-puzzle-grid">
            {tiles.map((val, idx) => (
              <div
                key={idx}
                className={`puzzle-tile ${val === 0 ? "empty" : ""}`}
                onClick={() => handleTileClick(idx)}
              >
                {val !== 0 ? val : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. BUBBLE SHOOTER GAME (Canvas-based)
// ==========================================
function BubbleShooterGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);

  const BUBBLE_RADIUS = 16;
  const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#eab308", "#a855f7"];

  const stateRef = useRef({
    grid: [] as string[][], // colors grid
    launcherAngle: Math.PI / 2,
    bulletColor: "#ef4444",
    nextColor: "#3b82f6",
    projectile: null as ProjectileBubble | null,
    score: 0,
    frame: 0
  });

  const triggerLaunch = () => {
    const state = stateRef.current;
    if (state.projectile) return; // Wait for active bullet to collide

    const angle = state.launcherAngle;
    state.projectile = {
      x: 240,
      y: 370,
      vx: Math.cos(angle) * 7.5,
      vy: -Math.sin(angle) * 7.5,
      color: state.bulletColor
    };

    // Swap ammo
    state.bulletColor = state.nextColor;
    state.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    triggerSound("laser");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Angle relative to center launcher base (240, 370)
    const dx = x - 240;
    const dy = 370 - y;
    let angle = Math.atan2(dy, dx);
    // Limit launcher sweep
    angle = Math.max(0.2, Math.min(Math.PI - 0.2, angle));
    stateRef.current.launcherAngle = angle;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    triggerLaunch();
  };

  const startGame = () => {
    // Generate initial bubble grid rows
    const initialGrid = Array(4).fill(null).map(() =>
      Array(15).fill(null).map(() => COLORS[Math.floor(Math.random() * COLORS.length)])
    );
    // pad bottom row with blanks
    for (let r = 4; r < 9; r++) {
      initialGrid.push(Array(15).fill(""));
    }

    stateRef.current = {
      grid: initialGrid,
      launcherAngle: Math.PI / 2,
      bulletColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      nextColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      projectile: null,
      score: 0,
      frame: 0
    };
    setScore(0);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const findMatchDFS = (row: number, col: number, targetColr: string, visited: boolean[][], matches: [number, number][]) => {
      if (row < 0 || row >= 9 || col < 0 || col >= 15) return;
      if (visited[row][col] || stateRef.current.grid[row][col] !== targetColr) return;

      visited[row][col] = true;
      matches.push([row, col]);

      const neighbors = [
        [row, col - 1], [row, col + 1],
        [row - 1, col], [row + 1, col],
        [row - 1, col - (row % 2 === 0 ? 1 : -1)], // offset hex grid neighbors
        [row + 1, col - (row % 2 === 0 ? 1 : -1)]
      ];

      neighbors.forEach(([nr, nc]) => findMatchDFS(nr, nc, targetColr, visited, matches));
    };

    const dropFloatingBubbles = () => {
      const grid = stateRef.current.grid;
      const visited = Array(9).fill(null).map(() => Array(15).fill(false));
      const connected = (r: number, c: number) => {
        if (r < 0 || r >= 9 || c < 0 || c >= 15) return;
        if (visited[r][c] || grid[r][c] === "") return;
        visited[r][c] = true;
        
        const neighbors = [
          [r, c - 1], [r, c + 1],
          [r - 1, c], [r + 1, c],
          [r - 1, c - (r % 2 === 0 ? 1 : -1)],
          [r + 1, c - (r % 2 === 0 ? 1 : -1)]
        ];
        neighbors.forEach(([nr, nc]) => connected(nr, nc));
      };

      // Flood fill from top ceiling (row 0)
      for (let c = 0; c < 15; c++) {
        if (grid[0][c] !== "") {
          connected(0, c);
        }
      }

      // Any cell not visited must drop!
      let dropCount = 0;
      for (let r = 1; r < 9; r++) {
        for (let c = 0; c < 15; c++) {
          if (grid[r][c] !== "" && !visited[r][c]) {
            grid[r][c] = "";
            dropCount++;
          }
        }
      }
      if (dropCount > 0) {
        stateRef.current.score += dropCount * 15;
        setScore(stateRef.current.score);
      }
    };

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // Move bullet
      if (state.projectile) {
        const proj = state.projectile;
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Bounce walls
        if (proj.x < BUBBLE_RADIUS || proj.x > 480 - BUBBLE_RADIUS) {
          proj.vx *= -1;
        }

        // Ceiling collision
        if (proj.y < BUBBLE_RADIUS) {
          // snap to closest col in top row
          const c = Math.max(0, Math.min(14, Math.floor(proj.x / (BUBBLE_RADIUS * 2))));
          state.grid[0][c] = proj.color;
          state.projectile = null;
          triggerSound("whack");
        } else {
          // Check collision with grid bubbles
          let collided = false;
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 15; c++) {
              if (state.grid[r][c] !== "") {
                // Compute visual coordinates
                const hexOffset = (r % 2 === 0) ? BUBBLE_RADIUS : 0;
                const bx = c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + hexOffset;
                const by = r * BUBBLE_RADIUS * 1.8 + BUBBLE_RADIUS;
                const dist = Math.hypot(proj.x - bx, proj.y - by);

                if (dist < BUBBLE_RADIUS * 1.8) {
                  collided = true;
                }
              }
            }
          }

          if (collided) {
            // Find closest empty slot on hex grid and snap
            let bestR = 0, bestC = 0, minDist = Infinity;
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 15; c++) {
                if (state.grid[r][c] === "") {
                  const hexOffset = (r % 2 === 0) ? BUBBLE_RADIUS : 0;
                  const bx = c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + hexOffset;
                  const by = r * BUBBLE_RADIUS * 1.8 + BUBBLE_RADIUS;
                  const dist = Math.hypot(proj.x - bx, proj.y - by);
                  if (dist < minDist) {
                    minDist = dist;
                    bestR = r;
                    bestC = c;
                  }
                }
              }
            }

            state.grid[bestR][bestC] = proj.color;
            state.projectile = null;
            triggerSound("whack");

            // Evaluate Match 3
            const visited = Array(9).fill(null).map(() => Array(15).fill(false));
            const matches: [number, number][] = [];
            findMatchDFS(bestR, bestC, proj.color, visited, matches);

            if (matches.length >= 3) {
              matches.forEach(([mr, mc]) => {
                state.grid[mr][mc] = "";
              });
              state.score += matches.length * 10;
              setScore(state.score);
              triggerSound("match");
              dropFloatingBubbles();
            }

            // Check Game Over (if grid overflows bottom)
            if (bestR >= 8) {
              setGameState("gameover");
              if (state.score > scores.bubble) {
                saveScores({ ...scores, bubble: state.score });
              }
              addCoins(Math.floor(state.score / 15));
              return;
            }
          }
        }
      }

      // --- Draw stage ---
      ctx.clearRect(0, 0, 480, 400);

      // Deep arcade ocean background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, 480, 400);

      // Grid helper lines
      ctx.strokeStyle = "rgba(51, 65, 85, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 480; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 400);
        ctx.stroke();
      }

      // Draw bubble grid
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 15; c++) {
          const color = state.grid[r][c];
          if (color !== "") {
            const hexOffset = (r % 2 === 0) ? BUBBLE_RADIUS : 0;
            const bx = c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + hexOffset;
            const by = r * BUBBLE_RADIUS * 1.8 + BUBBLE_RADIUS;

            ctx.beginPath();
            ctx.arc(bx, by, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw Shooter base launcher
      ctx.save();
      ctx.translate(240, 370);
      ctx.rotate(-state.launcherAngle);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(0, -6, 45, 12); // gun barrel
      ctx.beginPath();
      ctx.arc(45, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Launch Ammo bulb
      ctx.beginPath();
      ctx.arc(240, 370, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
      ctx.fillStyle = state.bulletColor;
      ctx.fill();

      // Next Ammo teaser
      ctx.beginPath();
      ctx.arc(200, 375, BUBBLE_RADIUS - 5, 0, Math.PI * 2);
      ctx.fillStyle = state.nextColor;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Draw bullet in flight
      if (state.projectile) {
        ctx.beginPath();
        ctx.arc(state.projectile.x, state.projectile.y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
        ctx.fillStyle = state.projectile.color;
        ctx.shadowColor = state.projectile.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
        style={{ display: "block", cursor: "crosshair" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🔮 泡泡大作战</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            滑动鼠标调整发射角度，点击屏幕发射彩色泡泡。三个及以上相同颜色的泡泡相碰时即可消除得分！
          </p>
          <button className="retro-btn" onClick={startGame}>启动泡泡机 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">本局得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新发射 / RESET</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", bottom: 15, left: 20, fontSize: "1.1rem", fontWeight: "bold", zIndex: 5, color: "#22d3ee", textShadow: "0 0 5px #22d3ee" }}>
          消除得分: {score}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. MATCH-3 BLITZ GEMS (DOM/Grid-based)
// ==========================================
function Match3Game({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [grid, setGrid] = useState<MatchGem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const COLORS = ["red", "yellow", "blue", "green", "purple", "cyan"];

  const buildInitialGrid = () => {
    // Generate layout ensuring no match-3 initially
    const newGrid: MatchGem[] = [];
    let idCounter = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let possibleColors = [...COLORS];
        
        // Check left neighbor
        if (c >= 2) {
          const c1 = newGrid[r * 8 + c - 1].color;
          const c2 = newGrid[r * 8 + c - 2].color;
          if (c1 === c2) {
            possibleColors = possibleColors.filter((col) => col !== c1);
          }
        }
        // Check top neighbor
        if (r >= 2) {
          const c1 = newGrid[(r - 1) * 8 + c].color;
          const c2 = newGrid[(r - 2) * 8 + c].color;
          if (c1 === c2) {
            possibleColors = possibleColors.filter((col) => col !== c1);
          }
        }

        const color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
        newGrid.push({ id: idCounter++, color, matched: false });
      }
    }
    setGrid(newGrid);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(45);
    buildInitialGrid();
    setSelectedIdx(null);
    setGameState("playing");
  };

  // Timer
  useEffect(() => {
    if (gameState !== "playing") return;

    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          setGameState("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === "gameover") {
      if (score > scores.match3) {
        saveScores({ ...scores, match3: score });
      }
      addCoins(Math.floor(score / 15));
    }
  }, [gameState]);

  // Check matching lines of 3 or more
  const resolveMatches = (currentGrid: MatchGem[]) => {
    let hasMatches = false;
    const matchesMask = Array(64).fill(false);

    // Horizontal check
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        const idx = r * 8 + c;
        const color = currentGrid[idx].color;
        if (color !== "" && currentGrid[idx + 1].color === color && currentGrid[idx + 2].color === color) {
          matchesMask[idx] = true;
          matchesMask[idx + 1] = true;
          matchesMask[idx + 2] = true;
          hasMatches = true;
        }
      }
    }

    // Vertical check
    for (let c = 0; c < 8; c++) {
      for (let r = 0; r < 6; r++) {
        const idx = r * 8 + c;
        const color = currentGrid[idx].color;
        if (color !== "" && currentGrid[idx + 8].color === color && currentGrid[idx + 16].color === color) {
          matchesMask[idx] = true;
          matchesMask[idx + 8] = true;
          matchesMask[idx + 16] = true;
          hasMatches = true;
        }
      }
    }

    if (hasMatches) {
      // Clear matched gems
      const nextGrid = currentGrid.map((gem, idx) => {
        if (matchesMask[idx]) {
          return { ...gem, color: "", matched: true };
        }
        return gem;
      });

      // Count score
      const matchCount = matchesMask.filter(Boolean).length;
      setScore((s) => s + matchCount * 10);
      triggerSound("match");

      // Gravity fall
      setTimeout(() => {
        applyGravityCascade(nextGrid);
      }, 200);
    }
  };

  const applyGravityCascade = (currentGrid: MatchGem[]) => {
    let nextGrid = [...currentGrid];

    // Push down columns
    for (let c = 0; c < 8; c++) {
      // Collect all color blocks in this column from bottom to top
      const colGems: string[] = [];
      for (let r = 7; r >= 0; r--) {
        if (nextGrid[r * 8 + c].color !== "") {
          colGems.push(nextGrid[r * 8 + c].color);
        }
      }

      // Fill remaining column cells with new random colors
      while (colGems.length < 8) {
        colGems.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
      }

      // Re-apply to grid from bottom to top
      for (let r = 7; r >= 0; r--) {
        nextGrid[r * 8 + c] = {
          id: nextGrid[r * 8 + c].id,
          color: colGems[7 - r],
          matched: false
        };
      }
    }

    setGrid(nextGrid);

    // Chain matches check recursively
    setTimeout(() => {
      resolveMatches(nextGrid);
    }, 200);
  };

  const handleGemClick = (index: number) => {
    if (gameState !== "playing") return;

    if (selectedIdx === null) {
      setSelectedIdx(index);
    } else {
      // Check if clicked neighbor
      const r1 = Math.floor(selectedIdx / 8);
      const c1 = selectedIdx % 8;
      const r2 = Math.floor(index / 8);
      const c2 = index % 8;

      const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
      if (dist === 1) {
        // Swap gems
        const nextGrid = [...grid];
        const tempColor = nextGrid[selectedIdx].color;
        nextGrid[selectedIdx].color = nextGrid[index].color;
        nextGrid[index].color = tempColor;

        triggerSound("slide");
        setGrid(nextGrid);
        setSelectedIdx(null);

        // check matches
        setTimeout(() => {
          resolveMatches(nextGrid);
        }, 150);
      } else {
        setSelectedIdx(index); // select new one
      }
    }
  };

  const renderGemIcon = (color: string) => {
    // Return unique SVG icons for different colors
    const colorsMap: Record<string, string> = {
      red: "#f43f5e",
      yellow: "#eab308",
      blue: "#3b82f6",
      green: "#10b981",
      purple: "#a855f7",
      cyan: "#06b6d4"
    };

    const targetColor = colorsMap[color] || "#fff";

    return (
      <svg className="gem-svg-icon" viewBox="0 0 24 24" fill="none">
        {color === "red" && <path d="M12 2L2 9L12 22L22 9L12 2Z" fill={targetColor} stroke="#fff" strokeWidth="1" />}
        {color === "yellow" && <rect x="3" y="3" width="18" height="18" rx="4" fill={targetColor} stroke="#fff" strokeWidth="1" />}
        {color === "blue" && <circle cx="12" cy="12" r="9" fill={targetColor} stroke="#fff" strokeWidth="1" />}
        {color === "green" && <polygon points="12,2 22,22 2,22" fill={targetColor} stroke="#fff" strokeWidth="1" />}
        {color === "purple" && <polygon points="12,2 21,8 18,21 6,21 3,8" fill={targetColor} stroke="#fff" strokeWidth="1" />}
        {color === "cyan" && <path d="M12 2L22 12L12 22L2 12L12 2Z" fill={targetColor} stroke="#fff" strokeWidth="1" />}
      </svg>
    );
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      {gameState === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", fontSize: "1.1rem", fontWeight: "bold", background: "#0b0f19", borderBottom: "2px solid #334155" }}>
          <span style={{ color: "#a855f7" }}>连消积分: {score}</span>
          <span style={{ color: "#fb7185" }}>能量限时: {timeLeft}s</span>
        </div>
      )}

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">💎 宝石消消乐</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            经典 Match-3 消除！点击选中一颗宝石，再点击相邻的一颗交换位置。将 3 颗或以上相同颜色的宝石排成直线或横线即可引爆消除！
          </p>
          <button className="retro-btn" onClick={startGame}>挑战消消乐 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>TIME OUT</div>
          <div className="retro-score-lbl">获得福报积分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重置开局 / RESET</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div className="match3-board">
            {grid.map((gem, idx) => (
              <div
                key={gem.id}
                className={`match3-gem ${selectedIdx === idx ? "selected" : ""}`}
                style={{
                  backgroundColor: "rgba(30, 41, 59, 0.4)",
                  color: gem.color
                }}
                onClick={() => handleGemClick(idx)}
              >
                {gem.color !== "" && renderGemIcon(gem.color)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 9. ZUMA SPIRAL BLASTER (Canvas-based)
// ==========================================
function ZumaGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);

  const BALL_RADIUS = 11;
  const PATH_SPACING = 20; // distance between sequence nodes
  const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#eab308", "#a855f7"];

  // Define spiral track coordinate nodes
  const trackNodes = useMemo(() => {
    const nodes: { x: number; y: number }[] = [];
    const centerX = 240;
    const centerY = 200;

    // Generate spiral curve path (Archimedean spiral)
    for (let theta = 0; theta < Math.PI * 8; theta += 0.05) {
      const r = 25 + theta * 8.5; // spiral outwards
      const x = centerX + Math.cos(theta) * r;
      const y = centerY + Math.sin(theta) * r;
      nodes.push({ x, y });
    }
    // Reverse so path goes from outward boundary inwards towards center goal
    return nodes.reverse();
  }, []);

  const stateRef = useRef({
    chain: [] as ZumaMarble[],
    bullet: null as ZumaBullet | null,
    bulletColor: "#ef4444",
    nextColor: "#3b82f6",
    aimAngle: 0,
    score: 0,
    frame: 0,
    rollSpeed: 0.7,
    idCounter: 0
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Aim from center skull base (240, 200)
    const dx = x - 240;
    const dy = y - 200;
    stateRef.current.aimAngle = Math.atan2(dy, dx);
  };

  const handleLaunch = () => {
    const state = stateRef.current;
    if (state.bullet) return;

    state.bullet = {
      x: 240,
      y: 200,
      vx: Math.cos(state.aimAngle) * 8.5,
      vy: Math.sin(state.aimAngle) * 8.5,
      color: state.bulletColor
    };

    // Roll new ammunition
    state.bulletColor = state.nextColor;
    state.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    triggerSound("laser");
  };

  const startGame = () => {
    const state = stateRef.current;
    state.score = 0;
    state.rollSpeed = 0.7;
    state.bullet = null;
    state.bulletColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    state.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Initialize chain with 18 spaced balls starting along track
    const newChain: ZumaMarble[] = [];
    for (let i = 0; i < 18; i++) {
      newChain.push({
        id: state.idCounter++,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        offset: i * BALL_RADIUS * 2 // space them
      });
    }

    state.chain = newChain;
    setScore(0);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // 1. Advance the marble chain offsets along winding track
      state.chain.forEach((marble) => {
        marble.offset += state.rollSpeed;
      });

      // Spawn new tail balls if the chain rolls forwards enough
      if (state.chain.length > 0 && state.chain[state.chain.length - 1].offset > BALL_RADIUS * 2) {
        state.chain.push({
          id: state.idCounter++,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          offset: 0
        });
      }

      // Check if front marble reaches the center endpoint skull goal
      if (state.chain.length > 0 && state.chain[0].offset >= trackNodes.length - 15) {
        setGameState("gameover");
        if (state.score > scores.zuma) {
          saveScores({ ...scores, zuma: state.score });
        }
        addCoins(Math.floor(state.score / 15));
        return;
      }

      // 2. Physics logic for fired shooter bullet
      if (state.bullet) {
        const b = state.bullet;
        b.x += b.vx;
        b.y += b.vy;

        // check collision with track chain marbles
        let hitIdx = -1;
        for (let i = 0; i < state.chain.length; i++) {
          const m = state.chain[i];
          const nodeIdx = Math.floor(m.offset);
          if (nodeIdx >= 0 && nodeIdx < trackNodes.length) {
            const node = trackNodes[nodeIdx];
            const dist = Math.hypot(b.x - node.x, b.y - node.y);
            if (dist < BALL_RADIUS * 2 - 2) {
              hitIdx = i;
              break;
            }
          }
        }

        // Out of bounds bullet cleanup
        if (b.x < 0 || b.x > 480 || b.y < 0 || b.y > 400) {
          state.bullet = null;
        } else if (hitIdx !== -1) {
          // Bullet hit chain! Insert bullet ball at collision index
          const collidedMarble = state.chain[hitIdx];
          const insertOffset = collidedMarble.offset;
          
          const newMarble: ZumaMarble = {
            id: state.idCounter++,
            color: b.color,
            offset: insertOffset - 1 // space slightly behind
          };

          // Insert
          state.chain.splice(hitIdx + 1, 0, newMarble);
          state.bullet = null;
          triggerSound("whack");

          // Align chain offsets to snap snugly together
          for (let i = hitIdx; i >= 0; i--) {
            if (state.chain[i].offset < state.chain[i + 1].offset + BALL_RADIUS * 2) {
              state.chain[i].offset = state.chain[i + 1].offset + BALL_RADIUS * 2;
            }
          }

          // Evaluate Match 3 matching colors checks
          const targetColor = newMarble.color;
          let leftIdx = hitIdx + 1;
          let rightIdx = hitIdx + 1;

          // Expand left matches
          while (leftIdx > 0 && state.chain[leftIdx - 1].color === targetColor) {
            leftIdx--;
          }
          // Expand right matches
          while (rightIdx < state.chain.length - 1 && state.chain[rightIdx + 1].color === targetColor) {
            rightIdx++;
          }

          const matchCount = rightIdx - leftIdx + 1;
          if (matchCount >= 3) {
            // Blow up matching run
            state.chain.splice(leftIdx, matchCount);
            state.score += matchCount * 12;
            setScore(state.score);
            triggerSound("match");
            // slow down speed briefly
            state.rollSpeed = Math.max(0.2, state.rollSpeed - 0.1);
          }
        }
      }

      // --- Draw Stage ---
      ctx.clearRect(0, 0, 480, 400);

      // Cyber space zuma backdrop grid
      ctx.fillStyle = "#070c14";
      ctx.fillRect(0, 0, 480, 400);

      // Draw winding track spiral line guide
      ctx.beginPath();
      trackNodes.forEach((node: { x: number; y: number }, idx: number) => {
        if (idx === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
      });
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();

      // Track center accent inner line
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw end Goal Skull (Golden skull at center)
      ctx.beginPath();
      ctx.arc(240, 200, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#ca8a04";
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      // eyes of skull
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(233, 196, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(247, 196, 3, 0, Math.PI*2); ctx.fill();

      // Draw marble chain
      state.chain.forEach((marble) => {
        const nodeIdx = Math.floor(marble.offset);
        if (nodeIdx >= 0 && nodeIdx < trackNodes.length) {
          const node = trackNodes[nodeIdx];
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, BALL_RADIUS - 1.5, 0, Math.PI * 2);
          ctx.fillStyle = marble.color;
          ctx.shadowColor = marble.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Swirl detail inside marble
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x - 3, node.y - 3, 4, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
      });

      // Draw center rotating frog frog-launcher
      ctx.save();
      ctx.translate(240, 200);
      ctx.rotate(state.aimAngle);
      
      // launcher pointer nose
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(10, -8);
      ctx.lineTo(24, 0);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();

      // Load ammo tease center
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = state.bulletColor;
      ctx.fill();

      ctx.restore();

      // Draw fired bullet in flight
      if (state.bullet) {
        ctx.beginPath();
        ctx.arc(state.bullet.x, state.bullet.y, BALL_RADIUS - 1.5, 0, Math.PI * 2);
        ctx.fillStyle = state.bullet.color;
        ctx.shadowColor = state.bullet.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        onMouseMove={handleMouseMove}
        onClick={handleLaunch}
        style={{ display: "block", cursor: "crosshair" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🐸 祖玛神像</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            滑动鼠标对准方向，点击屏幕发射彩色珠子。将3个或以上相同颜色的珠子连在一起即可消除。别让彩珠滚进最中心的金色神像口中！
          </p>
          <button className="retro-btn" onClick={startGame}>保卫神像 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重构护法 / CONTINUE</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, fontSize: "1.1rem", fontWeight: "bold", zIndex: 5, color: "#eab308", textShadow: "0 0 5px #eab308" }}>
          法阵能量: {score}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 10. NEON PACMAN GAME (Canvas-based)
// ==========================================
function PacmanGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [score, setScore] = useState<number>(0);

  const TILE_SIZE = 24; // 24 * 15 = 360 width, 24 * 15 = 360 height
  const MAZE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
    [1,3,1,1,0,1,0,0,0,1,0,1,1,3,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,0,2,0,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,3,1,1,0,1,0,0,0,1,0,1,1,3,1],
    [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ]; // 1 = wall, 0 = dot, 2 = empty, 3 = power pellet

  const stateRef = useRef({
    maze: [] as number[][],
    pacman: { x: 7, y: 8, dx: 0, dy: 0, nextDx: 0, nextDy: 0, angle: 0 },
    ghost: { x: 7, y: 5, dx: 1, dy: 0, isFrightened: false, frightTimer: 0 },
    score: 0,
    frame: 0
  });

  // Keyboard handle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        stateRef.current.pacman.nextDx = -1;
        stateRef.current.pacman.nextDy = 0;
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        stateRef.current.pacman.nextDx = 1;
        stateRef.current.pacman.nextDy = 0;
      } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        stateRef.current.pacman.nextDx = 0;
        stateRef.current.pacman.nextDy = -1;
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        stateRef.current.pacman.nextDx = 0;
        stateRef.current.pacman.nextDy = 1;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    const freshMaze = MAZE.map(row => [...row]);
    stateRef.current = {
      maze: freshMaze,
      pacman: { x: 7, y: 8, dx: 0, dy: 0, nextDx: 0, nextDy: 0, angle: 0 },
      ghost: { x: 7, y: 5, dx: 1, dy: 0, isFrightened: false, frightTimer: 0 },
      score: 0,
      frame: 0
    };
    setScore(0);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // Move entities at a lower rate than 60fps (e.g. every 12 frames)
      if (state.frame % 12 === 0) {
        // Frightened countdown
        if (state.ghost.isFrightened) {
          state.ghost.frightTimer--;
          if (state.ghost.frightTimer <= 0) {
            state.ghost.isFrightened = false;
          }
        }

        const pac = state.pacman;
        const gh = state.ghost;

        // --- 1. Pacman Navigation ---
        // Try next desired direction first
        let newX = pac.x + pac.nextDx;
        let newY = pac.y + pac.nextDy;
        if (state.maze[newY]?.[newX] !== 1) {
          pac.dx = pac.nextDx;
          pac.dy = pac.nextDy;
        }

        // Apply movement
        newX = pac.x + pac.dx;
        newY = pac.y + pac.dy;
        if (state.maze[newY]?.[newX] !== 1) {
          pac.x = newX;
          pac.y = newY;
        }

        // Eat dot
        const cell = state.maze[pac.y][pac.x];
        if (cell === 0) {
          state.maze[pac.y][pac.x] = 2; // eat it
          state.score += 10;
          setScore(state.score);
          triggerSound("whack");
        } else if (cell === 3) {
          state.maze[pac.y][pac.x] = 2; // eat power pellet
          state.score += 50;
          setScore(state.score);
          gh.isFrightened = true;
          gh.frightTimer = 40; // ~5 seconds (40 frames at 12fps)
          triggerSound("coin");
        }

        // Win check (if no dots or power pellets remain)
        let dotsRemain = false;
        for (let r = 0; r < 15; r++) {
          for (let c = 0; c < 15; c++) {
            if (state.maze[r][c] === 0 || state.maze[r][c] === 3) dotsRemain = true;
          }
        }
        if (!dotsRemain) {
          setGameState("victory");
          triggerSound("match");
          addCoins(30);
          if (state.score > scores.pacman) {
            saveScores({ ...scores, pacman: state.score });
          }
          return;
        }

        // --- 2. Ghost Navigation ---
        // Basic AI: Chase Pacman if normal, scatter if frightened
        const possibleDirs = [
          { dx: 0, dy: -1 }, // up
          { dx: 0, dy: 1 },  // down
          { dx: -1, dy: 0 }, // left
          { dx: 1, dy: 0 }   // right
        ].filter(d => {
          // Can't reverse immediately and can't walk into walls
          if (d.dx === -gh.dx && d.dy === -gh.dy) return false;
          return state.maze[gh.y + d.dy]?.[gh.x + d.dx] !== 1;
        });

        if (possibleDirs.length > 0) {
          let chosenDir = possibleDirs[0];
          if (gh.isFrightened) {
            // Pick random direction when frightened
            chosenDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
          } else {
            // Find direction that minimizes distance to Pacman (Euclidean)
            let minDist = Infinity;
            possibleDirs.forEach(d => {
              const dist = Math.hypot((gh.x + d.dx) - pac.x, (gh.y + d.dy) - pac.y);
              if (dist < minDist) {
                minDist = dist;
                chosenDir = d;
              }
            });
          }
          gh.dx = chosenDir.dx;
          gh.dy = chosenDir.dy;
          gh.x += gh.dx;
          gh.y += gh.dy;
        } else {
          // Fallback if trapped
          gh.dx = -gh.dx;
          gh.dy = -gh.dy;
          if (state.maze[gh.y + gh.dy]?.[gh.x + gh.dx] !== 1) {
            gh.x += gh.dx;
            gh.y += gh.dy;
          }
        }

        // --- 3. Collision Pacman vs Ghost ---
        if (pac.x === gh.x && pac.y === gh.y) {
          if (gh.isFrightened) {
            // Eat ghost
            state.score += 200;
            setScore(state.score);
            gh.x = 7;
            gh.y = 5; // respawn at cage
            gh.isFrightened = false;
            triggerSound("explosion");
          } else {
            // Dead!
            setGameState("gameover");
            triggerSound("explosion");
            if (state.score > scores.pacman) {
              saveScores({ ...scores, pacman: state.score });
            }
            addCoins(Math.floor(state.score / 15));
            return;
          }
        }
      }

      // --- DRAW MAZE STAGE ---
      ctx.clearRect(0, 0, 480, 400);

      // Background
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, 480, 400);

      // Offset board slightly to center
      const offsetX = 60;
      const offsetY = 20;

      // Draw Maze walls
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const val = state.maze[r][c];
          if (val === 1) {
            ctx.fillStyle = "#1e3a8a";
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 1.5;
            ctx.shadowColor = "#3b82f6";
            ctx.shadowBlur = 4;
            ctx.fillRect(offsetX + c * TILE_SIZE + 2, offsetY + r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeRect(offsetX + c * TILE_SIZE + 2, offsetY + r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.shadowBlur = 0;
          } else if (val === 0) {
            // Dot
            ctx.beginPath();
            ctx.arc(offsetX + c * TILE_SIZE + TILE_SIZE / 2, offsetY + r * TILE_SIZE + TILE_SIZE / 2, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#fde047";
            ctx.fill();
          } else if (val === 3) {
            // Power pellet (flash)
            if (state.frame % 30 < 15) {
              ctx.beginPath();
              ctx.arc(offsetX + c * TILE_SIZE + TILE_SIZE / 2, offsetY + r * TILE_SIZE + TILE_SIZE / 2, 7, 0, Math.PI * 2);
              ctx.fillStyle = "#facc15";
              ctx.fill();
            }
          }
        }
      }

      // Draw Pacman
      const px = offsetX + state.pacman.x * TILE_SIZE + TILE_SIZE / 2;
      const py = offsetY + state.pacman.y * TILE_SIZE + TILE_SIZE / 2;

      // Mouth opening calculation
      const mouthSize = Math.abs(Math.sin(state.frame * 0.15)) * 0.45;
      let startAngle = mouthSize;
      let endAngle = Math.PI * 2 - mouthSize;
      
      if (state.pacman.dx === -1) {
        startAngle += Math.PI;
        endAngle += Math.PI;
      } else if (state.pacman.dy === -1) {
        startAngle += Math.PI * 1.5;
        endAngle += Math.PI * 1.5;
      } else if (state.pacman.dy === 1) {
        startAngle += Math.PI * 0.5;
        endAngle += Math.PI * 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, TILE_SIZE / 2 - 2, startAngle, endAngle);
      ctx.lineTo(px, py);
      ctx.fillStyle = "#eab308";
      ctx.shadowColor = "#eab308";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Ghost
      const gx = offsetX + state.ghost.x * TILE_SIZE + TILE_SIZE / 2;
      const gy = offsetY + state.ghost.y * TILE_SIZE + TILE_SIZE / 2;
      const gr = TILE_SIZE / 2 - 2;

      ctx.beginPath();
      ctx.arc(gx, gy, gr, Math.PI, 0, false); // top round dome
      // bottom wavy feet
      ctx.lineTo(gx + gr, gy + gr);
      ctx.lineTo(gx + gr / 2, gy + gr - 4);
      ctx.lineTo(gx, gy + gr);
      ctx.lineTo(gx - gr / 2, gy + gr - 4);
      ctx.lineTo(gx - gr, gy + gr);
      ctx.closePath();

      if (state.ghost.isFrightened) {
        ctx.fillStyle = "#2563eb"; // blue vulnerable ghost
        ctx.shadowColor = "#2563eb";
      } else {
        ctx.fillStyle = "#ef4444"; // Blinky red ghost
        ctx.shadowColor = "#ef4444";
      }
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ghost eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 2, 3, 0, Math.PI * 2);
      ctx.arc(gx + 4, gy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(gx - 4 + state.ghost.dx * 1.5, gy - 2 + state.ghost.dy * 1.5, 1.2, 0, Math.PI * 2);
      ctx.arc(gx + 4 + state.ghost.dx * 1.5, gy - 2 + state.ghost.dy * 1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        style={{ display: "block" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🍕 霓虹吃豆人</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            使用键盘方向键或 WASD 移动黄色吃豆人，吃光迷宫里所有的发光小豆。吃到大豆可获得短时间反击红色幽灵的无敌能量！
          </p>
          <button className="retro-btn" onClick={startGame}>激活迷宫 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">吃豆得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新载入 / CONTINUE</button>
        </div>
      )}

      {gameState === "victory" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#10b981" }}>VICTORY!</div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "20px" }}>
            你成功清空了迷宫，获得满分奖励！
          </p>
          <button className="retro-btn" onClick={startGame}>再玩一次 / PLAY AGAIN</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, fontSize: "1.1rem", fontWeight: "bold", zIndex: 5, color: "#fde047", textShadow: "0 0 5px #fde047" }}>
          吃豆积分: {score}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 11. NEON SNAKE GAME (Canvas-based)
// ==========================================
function SnakeGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState<number>(0);

  const GRID_SIZE = 20; // 20 * 18 = 360 width/height
  const CELL_SIZE = 18;

  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    direction: { x: 0, y: -1 },
    nextDirection: { x: 0, y: -1 },
    food: { x: 5, y: 5 },
    score: 0,
    frame: 0
  });

  // Keyboard handle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const dir = stateRef.current.direction;
      if ((e.code === "ArrowLeft" || e.code === "KeyA") && dir.x === 0) {
        stateRef.current.nextDirection = { x: -1, y: 0 };
      } else if ((e.code === "ArrowRight" || e.code === "KeyD") && dir.x === 0) {
        stateRef.current.nextDirection = { x: 1, y: 0 };
      } else if ((e.code === "ArrowUp" || e.code === "KeyW") && dir.y === 0) {
        stateRef.current.nextDirection = { x: 0, y: -1 };
      } else if ((e.code === "ArrowDown" || e.code === "KeyS") && dir.y === 0) {
        stateRef.current.nextDirection = { x: 0, y: 1 };
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  const spawnFood = (snake: { x: number; y: number }[]) => {
    let foodX = Math.floor(Math.random() * GRID_SIZE);
    let foodY = Math.floor(Math.random() * GRID_SIZE);
    // ensure not on snake
    while (snake.some(cell => cell.x === foodX && cell.y === foodY)) {
      foodX = Math.floor(Math.random() * GRID_SIZE);
      foodY = Math.floor(Math.random() * GRID_SIZE);
    }
    return { x: foodX, y: foodY };
  };

  const startGame = () => {
    const initSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    stateRef.current = {
      snake: initSnake,
      direction: { x: 0, y: -1 },
      nextDirection: { x: 0, y: -1 },
      food: spawnFood(initSnake),
      score: 0,
      frame: 0
    };
    setScore(0);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // Move every 7 frames
      if (state.frame % 7 === 0) {
        state.direction = state.nextDirection;
        const head = {
          x: state.snake[0].x + state.direction.x,
          y: state.snake[0].y + state.direction.y
        };

        // Collision bounds or tail
        if (
          head.x < 0 || head.x >= GRID_SIZE ||
          head.y < 0 || head.y >= GRID_SIZE ||
          state.snake.some(cell => cell.x === head.x && cell.y === head.y)
        ) {
          setGameState("gameover");
          triggerSound("explosion");
          if (state.score > scores.snake) {
            saveScores({ ...scores, snake: state.score });
          }
          addCoins(Math.floor(state.score / 10));
          return;
        }

        // Add new head
        state.snake.unshift(head);

        // Check eat food
        if (head.x === state.food.x && head.y === state.food.y) {
          state.score += 10;
          setScore(state.score);
          state.food = spawnFood(state.snake);
          triggerSound("coin");
        } else {
          // Remove tail
          state.snake.pop();
        }
      }

      // --- Draw ---
      ctx.clearRect(0, 0, 480, 400);

      // Background
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, 480, 400);

      // Centering offset
      const ox = 60;
      const oy = 20;

      // Draw grid borders
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

      // Draw food
      const fx = ox + state.food.x * CELL_SIZE + CELL_SIZE / 2;
      const fy = oy + state.food.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(fx, fy, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw snake
      state.snake.forEach((cell, idx) => {
        const sx = ox + cell.x * CELL_SIZE + 1;
        const sy = oy + cell.y * CELL_SIZE + 1;
        const size = CELL_SIZE - 2;

        ctx.fillStyle = idx === 0 ? "#10b981" : "#059669";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = idx === 0 ? 8 : 2;
        ctx.fillRect(sx, sy, size, size);
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={canvasRef} width={480} height={400} style={{ display: "block" }} />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🐍 霓虹贪吃蛇</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            使用方向键或 WASD 操控小蛇移动。吃掉红色的发光苹果，避免撞到墙壁或自己的尾巴！
          </p>
          <button className="retro-btn" onClick={startGame}>启动小蛇 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">小蛇长度得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新注入 / CONTINUE</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, fontSize: "1.1rem", fontWeight: "bold", zIndex: 5, color: "#10b981", textShadow: "0 0 5px #10b981" }}>
          成长积分: {score}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 12. PONG BATTLE GAME (Canvas-based)
// ==========================================
function PongGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);

  const stateRef = useRef({
    ballX: 240,
    ballY: 200,
    ballVx: 4,
    ballVy: 2,
    playerY: 160,
    aiY: 160,
    paddleHeight: 70,
    paddleWidth: 10,
    playerScore: 0,
    aiScore: 0,
    frame: 0
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    stateRef.current.playerY = Math.max(20, Math.min(380 - stateRef.current.paddleHeight, y - stateRef.current.paddleHeight / 2));
  };

  const startGame = () => {
    stateRef.current = {
      ballX: 240,
      ballY: 200,
      ballVx: Math.random() > 0.5 ? 4 : -4,
      ballVy: (Math.random() - 0.5) * 4,
      playerY: 160,
      aiY: 160,
      paddleHeight: 70,
      paddleWidth: 10,
      playerScore: 0,
      aiScore: 0,
      frame: 0
    };
    setPlayerScore(0);
    setAiScore(0);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderLoop = () => {
      const state = stateRef.current;
      state.frame++;

      // Move Ball
      state.ballX += state.ballVx;
      state.ballY += state.ballVy;

      // AI Logic (Simple tracking)
      const aiSpeed = 2.8;
      const targetAiY = state.ballY - state.paddleHeight / 2;
      if (state.aiY < targetAiY) {
        state.aiY = Math.min(380 - state.paddleHeight, state.aiY + aiSpeed);
      } else {
        state.aiY = Math.max(20, state.aiY - aiSpeed);
      }

      // Ball vs Top/Bottom bounds
      if (state.ballY < 25 || state.ballY > 375) {
        state.ballVy *= -1;
        triggerSound("whack");
      }

      // Ball vs Left Paddle (AI)
      if (state.ballX <= 35 && state.ballX >= 25) {
        if (state.ballY >= state.aiY && state.ballY <= state.aiY + state.paddleHeight) {
          state.ballVx = Math.abs(state.ballVx) + 0.3; // speed up
          // angle change
          const relativeIntersectY = (state.aiY + (state.paddleHeight / 2)) - state.ballY;
          const normalizedIntersectY = relativeIntersectY / (state.paddleHeight / 2);
          state.ballVy = -normalizedIntersectY * 5.0;

          triggerSound("slide");
        }
      }

      // Ball vs Right Paddle (Player)
      if (state.ballX >= 445 && state.ballX <= 455) {
        if (state.ballY >= state.playerY && state.ballY <= state.playerY + state.paddleHeight) {
          state.ballVx = -(Math.abs(state.ballVx) + 0.3); // reverse and speed up
          const relativeIntersectY = (state.playerY + (state.paddleHeight / 2)) - state.ballY;
          const normalizedIntersectY = relativeIntersectY / (state.paddleHeight / 2);
          state.ballVy = -normalizedIntersectY * 5.0;

          triggerSound("slide");
        }
      }

      // Goal check AI (Right side scored)
      if (state.ballX < 10) {
        state.playerScore += 1;
        setPlayerScore(state.playerScore);
        triggerSound("coin");

        // Reset ball
        state.ballX = 240;
        state.ballY = 200;
        state.ballVx = 4;
        state.ballVy = (Math.random() - 0.5) * 4;
      }

      // Goal check Player (Left side scored)
      if (state.ballX > 470) {
        state.aiScore += 1;
        setAiScore(state.aiScore);
        triggerSound("explosion");

        // Reset ball
        state.ballX = 240;
        state.ballY = 200;
        state.ballVx = -4;
        state.ballVy = (Math.random() - 0.5) * 4;
      }

      // Match check
      if (state.playerScore >= 5) {
        setGameState("victory");
        addCoins(25);
        if (scores.pong < 1) {
          saveScores({ ...scores, pong: 1 });
        }
        return;
      } else if (state.aiScore >= 5) {
        setGameState("gameover");
        return;
      }

      // --- Draw ---
      ctx.clearRect(0, 0, 480, 400);

      // Deep space grid
      ctx.fillStyle = "#04020a";
      ctx.fillRect(0, 0, 480, 400);

      // Center dotted line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 15]);
      ctx.beginPath();
      ctx.moveTo(240, 20);
      ctx.lineTo(240, 380);
      ctx.stroke();
      ctx.setLineDash([]); // clear

      // Draw paddles
      ctx.fillStyle = "#3b82f6"; // AI (Blue)
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 8;
      ctx.fillRect(25, state.aiY, state.paddleWidth, state.paddleHeight);

      ctx.fillStyle = "#10b981"; // Player (Green)
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 8;
      ctx.fillRect(445, state.playerY, state.paddleWidth, state.paddleHeight);
      ctx.shadowBlur = 0;

      // Draw Ball
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={400}
        onMouseMove={handleMouseMove}
        style={{ display: "block", cursor: "none" }}
      />

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🏓 弹球大对战 (Pong)</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            滑动鼠标上下控制右侧的绿色弹板，将飞来的弹球弹回。首个获得 5 分的选手胜出！
          </p>
          <button className="retro-btn" onClick={startGame}>进入对战 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>DEFEATED</div>
          <div className="retro-score-lbl">你输掉了比赛 ({playerScore} - {aiScore})</div>
          <button className="retro-btn" onClick={startGame}>重返战场 / RETRY</button>
        </div>
      )}

      {gameState === "victory" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#10b981" }}>MATCH VICTORY!</div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "20px" }}>
            你以 {playerScore} - {aiScore} 的成绩击败了 AI！
          </p>
          <button className="retro-btn" onClick={startGame}>下一场比赛 / NEXT MATCH</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 15, left: 20, right: 20, display: "flex", justifyContent: "space-around", fontSize: "1.5rem", fontWeight: "bold", opacity: 0.7 }}>
          <span style={{ color: "#3b82f6" }}>{aiScore}</span>
          <span style={{ color: "#10b981" }}>{playerScore}</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 13. NEON 2048 PUZZLE GAME (DOM-based Grid)
// ==========================================
function Game2048Game({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [score, setScore] = useState<number>(0);
  const [grid, setGrid] = useState<number[]>(Array(16).fill(0));

  const addRandomTile = (currentGrid: number[]) => {
    const emptyIndices = currentGrid.map((val, idx) => val === 0 ? idx : -1).filter(idx => idx !== -1);
    if (emptyIndices.length > 0) {
      const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      currentGrid[randIdx] = Math.random() > 0.9 ? 4 : 2;
    }
  };

  const startGame = () => {
    const startGrid = Array(16).fill(0);
    addRandomTile(startGrid);
    addRandomTile(startGrid);
    setGrid(startGrid);
    setScore(0);
    setGameState("playing");
  };

  const slide = (row: number[]) => {
    let filtered = row.filter(val => val !== 0);
    let newRow: number[] = [];
    let i = 0;
    
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        newRow.push(filtered[i] * 2);
        setScore((s) => s + filtered[i] * 2);
        triggerSound("coin");
        i += 2;
      } else {
        newRow.push(filtered[i]);
        i++;
      }
    }
    
    while (newRow.length < 4) {
      newRow.push(0);
    }
    return newRow;
  };

  const handleMove = (direction: "up" | "down" | "left" | "right") => {
    if (gameState !== "playing") return;

    let nextGrid = [...grid];
    let changed = false;

    if (direction === "left") {
      for (let r = 0; r < 4; r++) {
        const row = nextGrid.slice(r * 4, r * 4 + 4);
        const slided = slide(row);
        if (JSON.stringify(row) !== JSON.stringify(slided)) changed = true;
        for (let c = 0; c < 4; c++) nextGrid[r * 4 + c] = slided[c];
      }
    } else if (direction === "right") {
      for (let r = 0; r < 4; r++) {
        const row = nextGrid.slice(r * 4, r * 4 + 4).reverse();
        const slided = slide(row).reverse();
        if (JSON.stringify(row.reverse()) !== JSON.stringify(slided)) changed = true;
        for (let c = 0; c < 4; c++) nextGrid[r * 4 + c] = slided[c];
      }
    } else if (direction === "up") {
      for (let c = 0; c < 4; c++) {
        const row = [nextGrid[c], nextGrid[c + 4], nextGrid[c + 8], nextGrid[c + 12]];
        const slided = slide(row);
        if (JSON.stringify(row) !== JSON.stringify(slided)) changed = true;
        for (let r = 0; r < 4; r++) nextGrid[r * 4 + c] = slided[r];
      }
    } else if (direction === "down") {
      for (let c = 0; c < 4; c++) {
        const row = [nextGrid[c], nextGrid[c + 4], nextGrid[c + 8], nextGrid[c + 12]].reverse();
        const slided = slide(row).reverse();
        if (JSON.stringify(row.reverse()) !== JSON.stringify(slided)) changed = true;
        for (let r = 0; r < 4; r++) nextGrid[r * 4 + c] = slided[r];
      }
    }

    if (changed) {
      addRandomTile(nextGrid);
      triggerSound("slide");
      setGrid(nextGrid);

      if (nextGrid.some(val => val === 2048)) {
        setGameState("victory");
        addCoins(50);
        if (score > scores.game2048) {
          saveScores({ ...scores, game2048: score });
        }
        return;
      }

      let movesLeft = false;
      if (nextGrid.some(val => val === 0)) movesLeft = true;
      else {
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 3; c++) {
            if (nextGrid[r * 4 + c] === nextGrid[r * 4 + c + 1]) movesLeft = true;
          }
        }
        for (let c = 0; c < 4; c++) {
          for (let r = 0; r < 3; r++) {
            if (nextGrid[r * 4 + c] === nextGrid[(r + 1) * 4 + c]) movesLeft = true;
          }
        }
      }

      if (!movesLeft) {
        setGameState("gameover");
        triggerSound("explosion");
        if (score > scores.game2048) {
          saveScores({ ...scores, game2048: score });
        }
        addCoins(Math.floor(score / 20));
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault(); handleMove("left");
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault(); handleMove("right");
      } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault(); handleMove("up");
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault(); handleMove("down");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, grid]);

  const tileColors: Record<number, string> = {
    2: "#06b6d4",
    4: "#10b981",
    8: "#f59e0b",
    16: "#ea580c",
    32: "#ec4899",
    64: "#ef4444",
    128: "#8b5cf6",
    256: "#d946ef",
    512: "#3b82f6",
    1024: "#a855f7",
    2048: "#14b8a6"
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      {gameState === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", fontSize: "1.1rem", fontWeight: "bold", background: "#0b0f19", borderBottom: "2px solid #334155" }}>
          <span style={{ color: "#06b6d4" }}>2048得分: {score}</span>
          <span style={{ color: "#64748b" }}>方向键滑动数字</span>
        </div>
      )}

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">🔢 霓虹 2048</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            使用方向键或 WASD 移动格体。相同数字的格体相撞时会合并并累加分值，争取凑出终极的 2048 霓虹方块！
          </p>
          <button className="retro-btn" onClick={startGame}>启动磁轨 / START</button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>GAME OVER</div>
          <div className="retro-score-lbl">最终得分: {score}</div>
          <button className="retro-btn" onClick={startGame}>重新划归 / RESET</button>
        </div>
      )}

      {gameState === "victory" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#10b981" }}>🏆 VICTORY 2048!</div>
          <div className="retro-score-lbl">完美分数: {score}</div>
          <button className="retro-btn" onClick={startGame}>再来一局 / PLAY AGAIN</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", background: "rgba(15, 23, 42, 0.9)", padding: "10px", borderRadius: "10px", width: "280px", height: "280px" }}>
            {grid.map((val, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color: val !== 0 ? "#fff" : "transparent",
                  backgroundColor: val !== 0 ? tileColors[val] || "#475569" : "rgba(30, 41, 59, 0.4)",
                  border: val !== 0 ? "2px solid #fff" : "1px dashed #334155",
                  boxShadow: val !== 0 ? `0 0 10px ${tileColors[val] || "#475569"}` : "none",
                  transition: "all 0.1s ease"
                }}
              >
                {val !== 0 ? val : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 14. GOBANG STRATEGY BOARD (DOM-based Grid)
// ==========================================
function GobangGame({ scores, saveScores, triggerSound, addCoins }: { scores: HighScores; saveScores: (s: HighScores) => void; triggerSound: (n: any) => void; addCoins: (n: number) => void }) {
  const [board, setBoard] = useState<string[]>(Array(15 * 15).fill(""));
  const [gameState, setGameState] = useState<"idle" | "playing" | "victory" | "defeat">("idle");

  const startGame = () => {
    setBoard(Array(15 * 15).fill(""));
    setGameState("playing");
  };

  const checkFive = (grid: string[], idx: number, color: string) => {
    const r = Math.floor(idx / 15);
    const c = idx % 15;
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];

    for (const [dr, dc] of dirs) {
      let count = 1;
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && grid[nr * 15 + nc] === color) {
          count++;
          step++;
        } else break;
      }
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && grid[nr * 15 + nc] === color) {
          count++;
          step++;
        } else break;
      }

      if (count >= 5) return true;
    }
    return false;
  };

  const aiMove = (currentBoard: string[]) => {
    const emptyIndices = currentBoard.map((val, idx) => val === "" ? idx : -1).filter(idx => idx !== -1);
    if (emptyIndices.length === 0) return;

    for (const idx of emptyIndices) {
      const copy = [...currentBoard];
      copy[idx] = "white";
      if (checkFive(copy, idx, "white")) {
        currentBoard[idx] = "white";
        return idx;
      }
    }

    for (const idx of emptyIndices) {
      const copy = [...currentBoard];
      copy[idx] = "black";
      if (checkFive(copy, idx, "black")) {
        currentBoard[idx] = "white";
        return idx;
      }
    }

    let bestIdx = emptyIndices[0];
    let maxWeight = -1;
    emptyIndices.forEach((idx) => {
      let weight = 0;
      const r = Math.floor(idx / 15);
      const c = idx % 15;
      
      weight += (7 - Math.abs(7 - r)) + (7 - Math.abs(7 - c));

      const neighbors = [
        [-1,-1], [-1,0], [-1,1],
        [0,-1],          [0,1],
        [1,-1],  [1,0],  [1,1]
      ];
      neighbors.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
          if (currentBoard[nr * 15 + nc] === "black") weight += 8;
          if (currentBoard[nr * 15 + nc] === "white") weight += 6;
        }
      });

      if (weight > maxWeight) {
        maxWeight = weight;
        bestIdx = idx;
      }
    });

    currentBoard[bestIdx] = "white";
    return bestIdx;
  };

  const handleCellClick = (index: number) => {
    if (gameState !== "playing" || board[index] !== "") return;

    const nextBoard = [...board];
    nextBoard[index] = "black";
    triggerSound("whack");

    if (checkFive(nextBoard, index, "black")) {
      setBoard(nextBoard);
      setGameState("victory");
      triggerSound("match");
      addCoins(40);
      if (scores.gobang < 1) {
        saveScores({ ...scores, gobang: 1 });
      }
      return;
    }

    const aiIdx = aiMove(nextBoard);
    setBoard(nextBoard);

    if (aiIdx !== undefined && checkFive(nextBoard, aiIdx, "white")) {
      setGameState("defeat");
      triggerSound("explosion");
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
      {gameState === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", fontSize: "0.85rem", background: "#0b0f19", borderBottom: "2px solid #334155" }}>
          <span style={{ color: "#06b6d4" }}>执子：蓝子 (玩家)</span>
          <span style={{ color: "#94a3b8" }}>五子连线即获胜</span>
        </div>
      )}

      {gameState === "idle" && (
        <div className="game-overlay-screen">
          <div className="retro-title">⚫ 棋魂五子棋</div>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px", lineHeight: "1.4" }}>
            经典五子棋对战。您执蓝色棋子，AI 执红色棋子。点击交叉点落子，任何方向达成连续五颗落子即为胜利！
          </p>
          <button className="retro-btn" onClick={startGame}>开局对垒 / START</button>
        </div>
      )}

      {gameState === "victory" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#10b981" }}>🏆 GOBANG VICTORY!</div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "20px" }}>
            恭喜！您成功运用智慧在残局中战胜了 AI！
          </p>
          <button className="retro-btn" onClick={startGame}>再下一盘 / PLAY AGAIN</button>
        </div>
      )}

      {gameState === "defeat" && (
        <div className="game-overlay-screen">
          <div className="retro-title" style={{ color: "#ef4444" }}>DEFEATED</div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "20px" }}>
            很遗憾，AI 棋高一着率先完成了五子连线。
          </p>
          <button className="retro-btn" onClick={startGame}>重整棋鼓 / RETRY</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(15, 1fr)", background: "#e2e8f0", padding: "4px", border: "3px solid #334155", borderRadius: "8px", width: "320px", height: "320px" }}>
            {board.map((stone, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  style={{
                    position: "relative",
                    cursor: stone === "" ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#94a3b8" }}></div>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#94a3b8" }}></div>
                  
                  {stone !== "" && (
                    <div
                      style={{
                        position: "absolute",
                        width: "80%",
                        height: "80%",
                        borderRadius: "50%",
                        backgroundColor: stone === "black" ? "#06b6d4" : "#f43f5e",
                        border: "1px solid #fff",
                        boxShadow: `0 0 6px ${stone === "black" ? "#06b6d4" : "#f43f5e"}`,
                        zIndex: 2
                      }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


