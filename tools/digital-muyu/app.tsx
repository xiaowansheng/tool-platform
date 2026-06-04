"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// Float text representation
interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  color?: string;
  shadow?: string;
}

// Active incense representation
interface IncenseStick {
  id: number;
  litTime: number; // performance.now() when lit
  duration: number; // burn duration in ms
  isActive: boolean;
}

// Active smoke particle representation
interface SmokeParticle {
  id: number;
  x: number;
  tilt: number;
  speed: number;
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

// Procedural Sound Synthesizers
const playClassicWoodblock = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const oscOvertone = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(740, ctx.currentTime);

  oscOvertone.type = "triangle";
  oscOvertone.frequency.setValueAtTime(1180, ctx.currentTime);

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  oscOvertone.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  oscOvertone.start();
  osc.stop(ctx.currentTime + 0.12);
  oscOvertone.stop(ctx.currentTime + 0.12);
};

const playWaterDroplet = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(580, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.16);
};

const playCyberSynth = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.1);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.Q.setValueAtTime(4, ctx.currentTime);

  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.14);
};

const playToySqueaker = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(950, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1900, ctx.currentTime + 0.05);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.11);

  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.13);
};

// Play metallic deep temple bell (磬/钟)
const playTempleBell = (ctx: AudioContext, vol = 0.35) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.5);
  gain.connect(ctx.destination);

  const frequencies = [156, 312, 478, 620, 784];
  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    const oscGain = ctx.createGain();
    const oscVol = index === 0 ? 0.8 : 0.4 / index;
    oscGain.gain.setValueAtTime(oscVol, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (5.5 - index * 0.7));

    osc.connect(oscGain);
    oscGain.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 5.5);
  });
};

// Ignite sound effect (sizzling noise)
const playIgniteSound = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 0.6; // 0.6 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // White noise
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
};

// Bowing swoosh sound effect
const playBowingSound = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(240, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

// Windchime helper
const playWindChimeNote = (ctx: AudioContext) => {
  const scale = [329.63, 392.00, 440.00, 493.88, 587.33, 659.25];
  const freq = scale[Math.floor(Math.random() * scale.length)];

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 3.5);
};

export default function CyberZenTempleTool({ manifest }: ToolAppProps) {
  // --- Navigation Tab ---
  const [activeTab, setActiveTab] = useState<"muyu" | "incense" | "kowtow">("muyu");

  // --- Shared Merit & Zen States ---
  const [meritCount, setMeritCount] = useState<number>(0);
  const [kowtowCount, setKowtowCount] = useState<number>(0);
  
  // Customization Options
  const [floatTextPattern, setFloatTextPattern] = useState<string>("功德 +1");
  const [customText, setCustomText] = useState<string>("");
  const [ambientSounds, setAmbientSounds] = useState<"none" | "bell" | "wind">("none");

  // Floating text animations
  const [floats, setFloats] = useState<FloatText[]>([]);
  const floatIdRef = useRef<number>(0);

  // --- TAB 1: Wooden Fish States ---
  const [soundType, setSoundType] = useState<"classic" | "water" | "cyber" | "toy">("classic");
  const [skin, setSkin] = useState<"classic" | "neon" | "gold" | "pink">("classic");
  const [isMuyuTapped, setIsMuyuTapped] = useState<boolean>(false);
  
  // Automatic Machine states
  const [autoTapActive, setAutoTapActive] = useState<boolean>(false);
  const [autoTapInterval, setAutoTapInterval] = useState<number>(1.2); // in seconds
  const [gearRotation, setGearRotation] = useState<number>(0);
  const [hammerActive, setHammerActive] = useState<boolean>(false);

  // --- TAB 2: Incense Burner States ---
  const [litIncenses, setLitIncenses] = useState<IncenseStick[]>([]);
  const [wishPattern, setWishPattern] = useState<string>("服务器无Bug");
  const [customWish, setCustomWish] = useState<string>("");
  const [activeWishCard, setActiveWishCard] = useState<string>("");
  const [smokeParticles, setSmokeParticles] = useState<SmokeParticle[]>([]);
  const [burnProgress, setBurnProgress] = useState<number>(100); // 100% to 0%

  // --- TAB 3: Kowtow Mat States ---
  const [cushionActive, setCushionActive] = useState<boolean>(false);
  const [showKowtowShadow, setShowKowtowShadow] = useState<boolean>(false);

  // Timer references
  const autoTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ambientTimerRef = useRef<NodeJS.Timeout | null>(null);
  const incenseBurnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const smokeParticlesIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Derive current floating text representation
  const currentFloatText = floatTextPattern === "custom" ? customText || "功德 +1" : floatTextPattern;

  // --- General Spacebar tapping listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        e.preventDefault();
        
        if (activeTab === "muyu") {
          triggerMuyuTap();
        } else if (activeTab === "incense") {
          triggerLightIncense();
        } else if (activeTab === "kowtow") {
          triggerKowtow();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, soundType, floatTextPattern, customText, litIncenses, wishPattern, customWish]);

  // --- Auto-Tapper loop (Wooden Fish Machine) ---
  useEffect(() => {
    if (autoTapActive && activeTab === "muyu") {
      const intervalMs = autoTapInterval * 1000;
      const tick = () => {
        // Trigger visual mallet hammer animation
        setHammerActive(true);
        setTimeout(() => setHammerActive(false), 200);

        // Rotate machine gears visually
        setGearRotation((prev) => (prev + 45) % 360);

        triggerMuyuTap();
        autoTapTimerRef.current = setTimeout(tick, intervalMs);
      };
      autoTapTimerRef.current = setTimeout(tick, intervalMs);
    } else {
      if (autoTapTimerRef.current) clearTimeout(autoTapTimerRef.current);
    }

    return () => {
      if (autoTapTimerRef.current) clearTimeout(autoTapTimerRef.current);
    };
  }, [autoTapActive, autoTapInterval, soundType, floatTextPattern, customText, activeTab]);

  // --- Incense burning simulation effect ---
  useEffect(() => {
    if (litIncenses.some((s) => s.isActive)) {
      // 1. Progress reduction interval
      if (!incenseBurnIntervalRef.current) {
        incenseBurnIntervalRef.current = setInterval(() => {
          setLitIncenses((prev) => {
            const now = performance.now();
            const updated = prev.map((stick) => {
              if (!stick.isActive) return stick;
              const elapsed = now - stick.litTime;
              const ratio = Math.max(0, 1 - elapsed / stick.duration);
              
              if (ratio <= 0) {
                // Stick has fully burnt
                return { ...stick, isActive: false };
              }
              return stick;
            });

            // Calculate overall progress based on the longest active stick
            const activeSticks = updated.filter((s) => s.isActive);
            if (activeSticks.length === 0) {
              setBurnProgress(100);
              setActiveWishCard("");
              if (incenseBurnIntervalRef.current) {
                clearInterval(incenseBurnIntervalRef.current);
                incenseBurnIntervalRef.current = null;
              }
            } else {
              const maxRatio = Math.max(...activeSticks.map((s) => 1 - (now - s.litTime) / s.duration));
              setBurnProgress(maxRatio * 100);
            }
            return updated;
          });
        }, 300);
      }

      // 2. Generate floating smoke particles
      if (!smokeParticlesIntervalRef.current) {
        let smokeParticleId = 0;
        smokeParticlesIntervalRef.current = setInterval(() => {
          setSmokeParticles((prev) => {
            // Filter old particles out of bounds
            const filtered = prev.map((p) => ({
              ...p,
              tilt: p.tilt + (Math.random() - 0.5) * 8, // sway side-to-side
              speed: p.speed + 1.2
            })).filter((p) => p.speed < 120);

            // Add new particle
            const newParticle: SmokeParticle = {
              id: smokeParticleId++,
              x: 80 + Math.random() * 40,
              tilt: (Math.random() - 0.5) * 15,
              speed: 0
            };
            return [...filtered, newParticle];
          });
        }, 120);
      }
    } else {
      // Clear timers if no active burning incense
      if (incenseBurnIntervalRef.current) {
        clearInterval(incenseBurnIntervalRef.current);
        incenseBurnIntervalRef.current = null;
      }
      if (smokeParticlesIntervalRef.current) {
        clearInterval(smokeParticlesIntervalRef.current);
        smokeParticlesIntervalRef.current = null;
      }
      setSmokeParticles([]);
    }

    return () => {
      if (incenseBurnIntervalRef.current) clearInterval(incenseBurnIntervalRef.current);
      if (smokeParticlesIntervalRef.current) clearInterval(smokeParticlesIntervalRef.current);
    };
  }, [litIncenses]);

  // --- Ambient Zen Wind chimes & temple bells schedule ---
  useEffect(() => {
    if (ambientSounds !== "none") {
      const ctx = getAudioContext();
      if (!ctx) return;

      const triggerAmbient = () => {
        if (ambientSounds === "bell") {
          playTempleBell(ctx, 0.25);
        } else if (ambientSounds === "wind") {
          playWindChimeNote(ctx);
          setTimeout(() => playWindChimeNote(ctx), 1500 + Math.random() * 1500);
        }
        const nextDelay = 18000 + Math.random() * 15000;
        ambientTimerRef.current = setTimeout(triggerAmbient, nextDelay);
      };

      triggerAmbient();
    } else {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    }

    return () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    };
  }, [ambientSounds]);

  // --- Trigger Methods ---
  const triggerMuyuTap = (clientX?: number, clientY?: number, padEl?: HTMLDivElement) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (soundType === "classic") playClassicWoodblock(ctx);
    else if (soundType === "water") playWaterDroplet(ctx);
    else if (soundType === "cyber") playCyberSynth(ctx);
    else if (soundType === "toy") playToySqueaker(ctx);

    setIsMuyuTapped(true);
    setTimeout(() => setIsMuyuTapped(false), 90);

    setMeritCount((prev) => prev + 1);

    // Compute coordinate points for float text
    let x = 110;
    let y = 60;
    if (clientX !== undefined && clientY !== undefined && padEl) {
      const rect = padEl.getBoundingClientRect();
      x = clientX - rect.left;
      y = clientY - rect.top;
    } else {
      x = 90 + Math.random() * 40;
      y = 50 + Math.random() * 20;
    }

    spawnFloatText(currentFloatText, x, y);
  };

  const triggerLightIncense = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    playIgniteSound(ctx);
    
    const now = performance.now();
    const duration = 75000; // burns for 75 seconds

    const sticks: IncenseStick[] = [
      { id: 1, litTime: now, duration, isActive: true },
      { id: 2, litTime: now - Math.random() * 1500, duration, isActive: true },
      { id: 3, litTime: now - Math.random() * 2500, duration, isActive: true }
    ];

    setLitIncenses(sticks);
    setBurnProgress(100);

    const wish = wishPattern === "custom" ? customWish || "心想事成" : wishPattern;
    setActiveWishCard(wish);

    setMeritCount((prev) => prev + 99); // Big merit boost!
    spawnFloatText(`祈福成功: 功德 +99`, 100, 20, "var(--accent-secondary)", "0 2px 10px rgba(56, 189, 248, 0.8)");
  };

  const triggerKowtow = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Play bowing swoosh and then the bell strike
    playBowingSound(ctx);
    setTimeout(() => playTempleBell(ctx, 0.4), 220);

    setCushionActive(true);
    setTimeout(() => setCushionActive(false), 120);

    setShowKowtowShadow(true);
    setTimeout(() => setShowKowtowShadow(false), 900);

    setKowtowCount((prev) => prev + 1);
    setMeritCount((prev) => prev + 10);

    spawnFloatText("虔诚叩首: 功德 +10", 100, 30, "var(--accent-warning)", "0 2px 8px rgba(251, 191, 36, 0.7)");
  };

  const spawnFloatText = (text: string, x: number, y: number, color?: string, shadow?: string) => {
    const id = floatIdRef.current++;
    const newFloat: FloatText = { id, text, x, y, color, shadow };
    setFloats((prev) => [...prev, newFloat]);
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1000);
  };

  const resetAllStats = () => {
    setMeritCount(0);
    setKowtowCount(0);
    setAutoTapActive(false);
    setLitIncenses([]);
    setBurnProgress(100);
    setActiveWishCard("");
    setAmbientSounds("none");
  };

  // Zen title logic
  const zenLevel = (() => {
    if (meritCount < 100) return "初入空门 (Zen Novice)";
    if (meritCount < 500) return "六根清净 (Inner Calm)";
    if (meritCount < 2000) return "觉悟圆满 (Zen Enlightenment)";
    return "法力无边 (Zen Buddha)";
  })();

  return (
    <section className="tool-panel">
      {/* Visual styling and animations stylesheet */}
      <style>{`
        .cyber-temple-workspace {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: 1.1fr 0.9fr;
          margin-top: 1.25rem;
        }

        @media (max-width: 900px) {
          .cyber-temple-workspace {
            grid-template-columns: 1fr;
          }
        }

        .cyber-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          position: relative;
        }

        /* Ambient background stage */
        .zen-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 350px;
          border-radius: var(--radius-xl);
          background: radial-gradient(circle at center, rgba(17, 34, 56, 0.45) 0%, rgba(5, 10, 18, 0.96) 100%);
          border: 1px solid var(--border-subtle);
          position: relative;
          overflow: hidden;
        }

        /* Tab Switcher Headers */
        .temple-tabs {
          display: flex;
          background: var(--bg-inset);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 4px;
          gap: 4px;
        }

        .temple-tab-btn {
          flex: 1;
          border-radius: var(--radius-md);
          border: none !important;
          background: transparent !important;
          color: var(--text-secondary);
          font-weight: 500;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: background var(--duration-fast), color var(--duration-fast);
          transform: none !important;
          box-shadow: none !important;
        }

        .temple-tab-btn.is-active {
          background: var(--bg-muted) !important;
          color: var(--accent-primary);
          font-weight: 700;
          box-shadow: var(--shadow-sm) !important;
        }

        .temple-tab-btn-title {
          font-size: 0.85rem;
        }

        .temple-tab-btn-subtitle {
          font-size: 0.65rem;
          opacity: 0.7;
        }

        /* --- Floating Merit Text animation --- */
        .muyu-float-text {
          position: absolute;
          font-size: 1.15rem;
          font-weight: 800;
          pointer-events: none;
          z-index: 20;
          color: var(--accent-primary);
          text-shadow: 0 2px 8px rgba(94, 234, 212, 0.6);
          animation: float-up-anim 1.0s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          font-family: system-ui, sans-serif;
        }

        @keyframes float-up-anim {
          0% {
            transform: translateY(0) scale(0.85);
            opacity: 1;
          }
          100% {
            transform: translateY(-90px) scale(1.15);
            opacity: 0;
          }
        }

        /* --- TAB 1: Automatic Woodblock machine gears and arm mallet --- */
        .muyu-svg-wrapper {
          position: relative;
          width: 170px;
          height: 170px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.08s cubic-bezier(0.25, 0.8, 0.25, 1);
          z-index: 5;
          user-select: none;
        }

        .muyu-svg-wrapper.is-tapped {
          transform: scale(0.86) skewY(-2deg);
        }

        .skin-classic { fill: url(#classicWoodGrad); stroke: #5c3922; }
        .skin-neon { fill: rgba(13, 24, 38, 0.8); stroke: #38bdf8; stroke-width: 4.5; }
        .skin-gold { fill: url(#goldGrad); stroke: #a15c0f; }
        .skin-pink { fill: url(#pinkGrad); stroke: #be185d; }

        /* Robotic Woodblock gear mechanics */
        .mechanical-arm-container {
          position: absolute;
          top: 30px;
          left: 10px;
          width: 100px;
          height: 100px;
          pointer-events: none;
          z-index: 2;
        }

        .mech-gear {
          transform-origin: center;
          transition: transform 0.3s ease;
          fill: var(--text-tertiary);
          opacity: 0.35;
        }

        .mech-mallet {
          transform-origin: 30px 70px;
          transition: transform 0.1s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }

        .mech-mallet.is-hitting {
          transform: rotate(32deg);
        }

        /* --- TAB 2: Incense smoke particles and burning simulation --- */
        .burner-svg-container {
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 5;
        }

        .incense-stick-element {
          position: absolute;
          width: 4px;
          background: #c0a080;
          border-radius: 2px;
          transform-origin: bottom center;
          z-index: 4;
          transition: height 0.3s linear;
        }

        .incense-stick-lit-tip {
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f43f5e;
          box-shadow: 0 0 10px #f43f5e, 0 0 18px #fbbf24;
          z-index: 5;
        }

        .incense-smoke-particle {
          position: absolute;
          bottom: 145px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(232, 239, 247, 0.18);
          filter: blur(4px);
          pointer-events: none;
          z-index: 3;
          animation: smoke-drift-anim 3.5s infinite linear;
        }

        @keyframes smoke-drift-anim {
          0% {
            transform: translateY(0) scale(1.0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.55;
          }
          50% {
            transform: translateY(-80px) scale(3.5) translateX(var(--drift-x, 15px));
            opacity: 0.3;
          }
          100% {
            transform: translateY(-160px) scale(6.0) translateX(var(--drift-x2, -25px));
            opacity: 0;
          }
        }

        /* Golden Wish card scroll */
        .wish-card-scroll {
          position: absolute;
          top: 15px;
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
          border: 2px solid #d97706;
          border-radius: var(--radius-sm);
          padding: 6px 16px;
          color: #78350f;
          font-weight: bold;
          font-size: 0.8rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
          z-index: 10;
          animation: scroll-sway 3s infinite ease-in-out;
        }

        @keyframes scroll-sway {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          50% { transform: rotate(2deg) translateY(-3px); }
        }

        /* --- TAB 3: Worship Mat with silhouette animations --- */
        .cushion-stage {
          width: 180px;
          height: 180px;
          position: relative;
          z-index: 5;
          transition: transform 0.1s ease;
        }

        .cushion-stage.is-squished {
          transform: scaleX(1.08) scaleY(0.85);
        }

        .worshipper-silhouette {
          position: absolute;
          top: 40px;
          width: 140px;
          height: 140px;
          fill: rgba(255, 255, 255, 0.08);
          pointer-events: none;
          z-index: 6;
          opacity: 0;
          transition: opacity 0.25s ease, transform 0.4s ease;
        }

        .worshipper-silhouette.is-bowing {
          opacity: 1;
          transform: translateY(30px) scaleY(0.55);
          animation: bow-down-cycle 0.8s ease-in-out forwards;
        }

        @keyframes bow-down-cycle {
          0% {
            opacity: 0;
            transform: translateY(0) scaleY(1);
          }
          30% {
            opacity: 0.85;
            transform: translateY(22px) scaleY(0.48);
          }
          70% {
            opacity: 0.85;
            transform: translateY(22px) scaleY(0.48);
          }
          100% {
            opacity: 0;
            transform: translateY(0) scaleY(1);
          }
        }

        /* Zen breathing circle trainer */
        .breath-trainer {
          background: rgba(6, 14, 22, 0.38);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 0.85rem;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }

        .breath-coach-ring {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2.5px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .breath-coach-core {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-primary);
          animation: breath-guide-pulse 7s infinite ease-in-out;
        }

        @keyframes breath-guide-pulse {
          0%, 100% {
            transform: scale(1.0);
            background: var(--accent-primary);
            opacity: 0.6;
          }
          35%, 55% {
            transform: scale(2.3);
            background: var(--accent-secondary);
            opacity: 0.95;
          }
          85% {
            transform: scale(1.0);
            opacity: 0.6;
          }
        }

        /* Global counter card style */
        .merit-billboard {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0.6rem 0;
          gap: 2px;
        }

        .merit-rank-tag {
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          padding: 2px 12px;
          font-size: 0.72rem;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }

        .merit-grand-value {
          font-size: 2.8rem;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1.1;
          text-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }
      `}</style>

      {/* Shared Header Copy */}
      <div className="tool-panel__header">
        <p className="eyebrow">娱乐工具</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>

      {/* Cyber Temple Layout */}
      <div className="cyber-temple-workspace">
        {/* ==================================================== */}
        {/* LEFT COLUMN: Zen Stage & Tab Components */}
        {/* ==================================================== */}
        <div className="cyber-card" style={{ gap: "1rem" }}>
          
          {/* Main Temple Tab Navigation */}
          <div className="temple-tabs">
            <button
              type="button"
              className={`temple-tab-btn ${activeTab === "muyu" ? "is-active" : ""}`}
              onClick={() => setActiveTab("muyu")}
            >
              <span className="temple-tab-btn-title">木鱼功德机</span>
              <span className="temple-tab-btn-subtitle">打坐敲打</span>
            </button>
            <button
              type="button"
              className={`temple-tab-btn ${activeTab === "incense" ? "is-active" : ""}`}
              onClick={() => setActiveTab("incense")}
            >
              <span className="temple-tab-btn-title">三清福香炉</span>
              <span className="temple-tab-btn-subtitle">燃香祈愿</span>
            </button>
            <button
              type="button"
              className={`temple-tab-btn ${activeTab === "kowtow" ? "is-active" : ""}`}
              onClick={() => setActiveTab("kowtow")}
            >
              <span className="temple-tab-btn-title">虔诚跪拜垫</span>
              <span className="temple-tab-btn-subtitle">磕头礼拜</span>
            </button>
          </div>

          {/* Grand Billboard Counter */}
          <div className="merit-billboard">
            <span className="merit-rank-tag">{zenLevel}</span>
            <span className="merit-grand-value">{meritCount}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>当前法力功德 (Current Cyber Merit)</span>
          </div>

          {/* Dynamic Zen Stage Display */}
          <div className="zen-stage">
            {/* 1. Rendering Floating text animations */}
            {floats.map((float) => (
              <span
                key={float.id}
                className="muyu-float-text"
                style={{ 
                  left: float.x, 
                  top: float.y,
                  color: float.color || "var(--accent-primary)",
                  textShadow: float.shadow || "0 2px 8px rgba(94, 234, 212, 0.6)"
                }}
              >
                {float.text}
              </span>
            ))}

            {/* TAB VIEW 1: Wooden Fish Machine */}
            {activeTab === "muyu" && (
              <div 
                style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    const pad = e.currentTarget;
                    triggerMuyuTap(e.clientX, e.clientY, pad);
                  }
                }}
              >
                {/* Mechanical Gears (appears when auto-tapping is active) */}
                {autoTapActive && (
                  <div className="mechanical-arm-container">
                    {/* Spinning gear */}
                    <svg viewBox="0 0 100 100" width="40" height="40" className="mech-gear" style={{ transform: `rotate(${gearRotation}deg)` }}>
                      <path d="M50,30 A20,20 0 1,0 50,70 A20,20 0 1,0 50,30 Z M50,42 A8,8 0 1,1 50,58 A8,8 0 1,1 50,42 Z" stroke="var(--text-secondary)" strokeWidth="3" fill="none" />
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                        <rect key={angle} x="47" y="18" width="6" height="12" rx="2" fill="var(--text-secondary)" transform={`rotate(${angle} 50 50)`} />
                      ))}
                    </svg>

                    {/* Mechanical Hammer striking */}
                    <svg viewBox="0 0 100 100" width="80" height="80" style={{ position: "absolute", top: -10, left: 15 }} className={`mech-mallet ${hammerActive ? "is-hitting" : ""}`}>
                      {/* Mallet body */}
                      <line x1="30" y1="70" x2="70" y2="40" stroke="var(--text-secondary)" strokeWidth="4" />
                      {/* Mallet head */}
                      <circle cx="70" cy="40" r="10" fill="var(--accent-primary)" />
                    </svg>
                  </div>
                )}

                {/* Wooden Fish Vector SVG Graphic */}
                <div className={`muyu-svg-wrapper ${isMuyuTapped ? "is-tapped" : ""}`}>
                  <svg 
                    viewBox="0 0 200 200" 
                    className={`skin-${skin}`}
                    width="100%" 
                    height="100%" 
                    style={{ fillRule: "evenodd", strokeLinejoin: "round" }}
                  >
                    <path 
                      d="M100,20 C140,20 175,50 175,90 C175,120 160,140 145,155 C135,165 115,175 100,175 C85,175 65,165 55,155 C40,140 25,120 25,90 C25,50 60,20 100,20 Z" 
                      strokeWidth="3.5"
                    />
                    <path 
                      d="M60,105 C70,115 85,120 100,120 C115,120 130,115 140,105 C130,100 115,97 100,97 C85,97 70,100 60,105 Z" 
                      fill={skin === "neon" ? "transparent" : "#1e120a"} 
                      strokeWidth="1.5"
                    />
                    <path d="M50,80 C65,70 135,70 150,80" fill="none" strokeWidth="2.5" />
                    <path d="M60,60 C75,50 125,50 140,60" fill="none" strokeWidth="2" />
                    <path d="M100,20 L100,45" fill="none" strokeWidth="2" />
                  </svg>
                </div>
                
                <div className="keyboard-hint" style={{ marginTop: "1rem" }}>
                  <span style={{ background: "var(--bg-muted)", border: "1px solid var(--border-default)", padding: "1px 6px", borderRadius: "3px", fontFamily: "monospace" }}>
                    SPACE
                  </span>
                  <span>按空格键敲击木鱼功德</span>
                </div>
              </div>
            )}

            {/* TAB VIEW 2: Incense Burner */}
            {activeTab === "incense" && (
              <div 
                style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                onClick={() => {
                  if (litIncenses.length === 0) triggerLightIncense();
                }}
              >
                {/* Active Wish Text Scroll Banner */}
                {activeWishCard && (
                  <div className="wish-card-scroll">
                    🎋 祈愿：{activeWishCard} 🎋
                  </div>
                )}

                {/* Smoke drift particles */}
                {smokeParticles.map((particle) => (
                  <div
                    key={particle.id}
                    className="incense-smoke-particle"
                    style={{
                      left: particle.x,
                      bottom: 125 + particle.speed,
                      opacity: Math.max(0, 0.6 - particle.speed / 180),
                      transform: `scale(${1.0 + particle.speed / 28}) translateX(${Math.sin(particle.speed / 15) * 12 + particle.tilt}px)`
                    }}
                  />
                ))}

                {/* Incense Burner and Sticks */}
                <div className="burner-svg-container">
                  {/* Lit Incense Sticks inside the burner */}
                  {litIncenses.map((stick, index) => {
                    const offsetLeft = [40, 50, 60][index]; // space the 3 sticks
                    const initialHeight = [65, 75, 70][index]; // different stick lengths
                    const activeHeight = stick.isActive ? initialHeight * (burnProgress / 100) : 0;

                    return (
                      <div
                        key={stick.id}
                        className="incense-stick-element"
                        style={{
                          left: `${offsetLeft}%`,
                          bottom: "65px",
                          height: `${activeHeight}px`,
                          width: "3px",
                          background: stick.isActive ? "#7c2d12" : "#9ca3af",
                          opacity: stick.isActive ? 1 : 0.45
                        }}
                      >
                        {/* Red burning tip */}
                        {stick.isActive && <div className="incense-stick-lit-tip" />}
                      </div>
                    );
                  })}

                  {/* Bronze tripod incense burner vector shape */}
                  <svg viewBox="0 0 100 100" width="100%" height="100%">
                    {/* Handles */}
                    <path d="M15,50 C10,35 25,35 25,50" fill="none" stroke="#b45309" strokeWidth="4" />
                    <path d="M85,50 C90,35 75,35 75,50" fill="none" stroke="#b45309" strokeWidth="4" />
                    
                    {/* Burner Body */}
                    <path d="M22,48 L78,48 C78,72 22,72 22,48 Z" fill="url(#bronzeGrad)" stroke="#78350f" strokeWidth="3" />
                    
                    {/* Trim decor */}
                    <rect x="25" y="48" width="50" height="5" fill="#f59e0b" rx="1" />
                    
                    {/* Legs */}
                    <path d="M30,68 L26,82 C25,85 28,88 32,85 L38,72" fill="#78350f" />
                    <path d="M70,68 L74,82 C75,85 72,88 68,85 L62,72" fill="#78350f" />
                    <path d="M50,70 L50,86 C50,88 48,88 48,86 L46,70" fill="#78350f" />

                    <defs>
                      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="60%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#78350f" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="keyboard-hint" style={{ marginTop: "1rem" }}>
                  {litIncenses.some((s) => s.isActive) ? (
                    <span style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>
                      🔥 清香点燃中... 燃尽剩余 {(burnProgress * 0.75).toFixed(0)} 秒
                    </span>
                  ) : (
                    <>
                      <span style={{ background: "var(--bg-muted)", border: "1px solid var(--border-default)", padding: "1px 6px", borderRadius: "3px", fontFamily: "monospace" }}>
                        SPACE
                      </span>
                      <span>按空格键上三炷福香</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB VIEW 3: Kowtow Mat */}
            {activeTab === "kowtow" && (
              <div 
                style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    triggerKowtow();
                  }
                }}
              >
                {/* Worshipper Bowing Silhouette */}
                <svg viewBox="0 0 100 100" className={`worshipper-silhouette ${showKowtowShadow ? "is-bowing" : ""}`}>
                  {/* Head */}
                  <circle cx="50" cy="20" r="10" />
                  {/* Body bending */}
                  <path d="M50,30 C30,40 25,65 50,72 C55,75 45,85 50,85" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  {/* Bended arms */}
                  <path d="M42,34 C25,48 30,75 45,75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>

                {/* Cushion Worship Mat */}
                <div className={`cushion-stage ${cushionActive ? "is-squished" : ""}`}>
                  <svg viewBox="0 0 100 100" width="100%" height="100%">
                    {/* Mat Body */}
                    <ellipse cx="50" cy="50" rx="42" ry="25" fill="#fcd34d" stroke="#d97706" strokeWidth="3" />
                    
                    {/* Inner Pattern circle */}
                    <ellipse cx="50" cy="50" rx="30" ry="17" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
                    
                    {/* Red Lotus design center */}
                    <path d="M50,42 C46,47 46,53 50,58 C54,53 54,47 50,42 Z" fill="#ef4444" />
                    <path d="M42,50 C47,46 53,46 58,50 C53,54 47,54 42,50 Z" fill="#ef4444" />
                    <circle cx="50" cy="50" r="4" fill="#fbbf24" />
                  </svg>
                </div>

                <div className="keyboard-hint" style={{ marginTop: "1rem" }}>
                  <span style={{ background: "var(--bg-muted)", border: "1px solid var(--border-default)", padding: "1px 6px", borderRadius: "3px", fontFamily: "monospace" }}>
                    SPACE
                  </span>
                  <span>按空格键在蒲团前虔诚跪拜</span>
                </div>
              </div>
            )}

          </div>

          {/* Actions Row */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="button" 
              onClick={resetAllStats} 
              className="button--danger" 
              style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-full)" }}
            >
              重置功德与修行数据
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: Settings / Mindfulness Breathing */}
        {/* ==================================================== */}
        <div className="cyber-card" style={{ gap: "1.2rem" }}>
          <h3 className="section-title" style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
            法器定制与功德簿
          </h3>

          {/* Conditional panels based on tabs */}
          {activeTab === "muyu" && (
            <>
              {/* Woodblock skin selector */}
              <div className="tool-field">
                <span>木鱼皮肤材质 (Skin Style)</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", marginTop: "4px" }}>
                  {[
                    { id: "classic", name: "木纹经典" },
                    { id: "neon", name: "赛博霓虹" },
                    { id: "gold", name: "皇家纯金" },
                    { id: "pink", name: "粉萌少女" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSkin(item.id as any)}
                      style={{
                        background: skin === item.id ? "var(--bg-muted)" : "var(--bg-inset)",
                        borderColor: skin === item.id ? "var(--accent-primary)" : "var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "8px 10px"
                      }}
                    >
                      <span style={{ fontSize: "0.78rem", fontWeight: skin === item.id ? "bold" : "normal" }}>
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio selector */}
              <div className="tool-field">
                <span>木鱼音色类型 (Sound Tone)</span>
                <select 
                  value={soundType} 
                  onChange={(e) => setSoundType(e.target.value as any)}
                  style={{ width: "100%", marginTop: "4px" }}
                >
                  <option value="classic">经典木制木鱼</option>
                  <option value="water">空灵清脆水滴</option>
                  <option value="cyber">赛博电子鼓点</option>
                  <option value="toy">萌趣宠物尖叫 (Toy)</option>
                </select>
              </div>

              {/* Automatic clicking wooden tapper machine */}
              <div className="tool-field" style={{ background: "rgba(6, 14, 22, 0.25)", border: "1px solid var(--border-subtle)", padding: "10px", borderRadius: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-primary)" }}>自动木鱼机开关 (Auto Tapper)</span>
                  <input 
                    type="checkbox" 
                    checked={autoTapActive} 
                    onChange={(e) => setAutoTapActive(e.target.checked)} 
                  />
                </label>
                {autoTapActive && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      <span>自动敲击间隔: {autoTapInterval} 秒</span>
                      <span>频率: {(1 / autoTapInterval).toFixed(1)} 次/秒</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.4" 
                      max="3.0" 
                      step="0.1" 
                      value={autoTapInterval} 
                      onChange={(e) => setAutoTapInterval(Number(e.target.value))} 
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "incense" && (
            <>
              {/* Incense blessing wish tag selection */}
              <div className="tool-field">
                <span>祈福许愿卡片 (Wish Blessing Card)</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                  <select 
                    value={wishPattern} 
                    onChange={(e) => setWishPattern(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="服务器无Bug">🖥️ 服务器稳如狗，上线无 Bug</option>
                    <option value="工资暴涨">💰 薪资翻倍，股票涨停</option>
                    <option value="身体健康">🏃 告别熬夜，头发浓密，身体倍棒</option>
                    <option value="喜结良缘">❤️ 桃花旺盛，早日脱单</option>
                    <option value="心想事成">✨ 万事胜意，心想事成</option>
                    <option value="custom">✍️ 自定义心愿 (Write Custom Wish)</option>
                  </select>

                  {wishPattern === "custom" && (
                    <input
                      type="text"
                      maxLength={18}
                      value={customWish}
                      onChange={(e) => setCustomWish(e.target.value)}
                      placeholder="写下你的赛博愿望，例: 早点下班"
                      style={{ width: "100%", fontSize: "0.8rem", padding: "6px 10px" }}
                    />
                  )}
                </div>
              </div>

              {/* Lit incense stick actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }} className="tool-field">
                <button
                  type="button"
                  className="button--primary"
                  onClick={triggerLightIncense}
                  disabled={litIncenses.some((s) => s.isActive)}
                  style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "10px" }}
                >
                  {litIncenses.some((s) => s.isActive) ? "香火正旺中..." : "上三炷清香 (Light Incense)"}
                </button>
                <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", margin: 0, textAlign: "center" }}>
                  点香一次可得 99 功德，伴随真实的烟雾飘动特效。
                </p>
              </div>
            </>
          )}

          {activeTab === "kowtow" && (
            <>
              {/* Worship Cushion stats block */}
              <div className="metric-tile" style={{ borderLeft: "4px solid var(--accent-warning)" }}>
                <span className="metric-tile-label">已累计跪拜礼数</span>
                <span className="metric-tile-value" style={{ color: "var(--accent-warning)" }}>
                  {kowtowCount} <span style={{ fontSize: "0.85rem", fontWeight: "normal" }}>次</span>
                </span>
                <span className="metric-tile-sub">虔诚一拜，功德 +10</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }} className="tool-field">
                <button
                  type="button"
                  className="button--primary"
                  onClick={triggerKowtow}
                  style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "10px" }}
                >
                  虔诚顶礼膜拜 (Bow / Kowtow)
                </button>
                <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", margin: 0, textAlign: "center" }}>
                  点击蒲团或按空格，在清脆的铜磬声中进行虔诚顶礼。
                </p>
              </div>
            </>
          )}

          {/* Floating Merit Text Pattern Selector */}
          <div className="tool-field">
            <span>敲击悬浮词条 (Floating Words)</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              <select 
                value={floatTextPattern} 
                onChange={(e) => setFloatTextPattern(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="功德 +1">功德 +1 (Merit +1)</option>
                <option value="烦恼 -1">烦恼 -1 (Worries -1)</option>
                <option value="工资 +1">工资 +1 (Salary +1)</option>
                <option value="头发 +1">头发 +1 (Hair +1)</option>
                <option value="Bug -1">Bug -1 (Error -1)</option>
                <option value="custom">自定义文本 (Custom Text)</option>
              </select>

              {floatTextPattern === "custom" && (
                <input
                  type="text"
                  maxLength={15}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="请输入您的词条，如：健康值 +1"
                  style={{ width: "100%", fontSize: "0.8rem", padding: "6px 10px" }}
                />
              )}
            </div>
          </div>

          {/* Zen Ambient Sound Selector */}
          <div className="tool-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span>禅林背景音声 (Zen Ambience)</span>
            <select
              value={ambientSounds}
              onChange={(e) => setAmbientSounds(e.target.value as any)}
              style={{ width: "100%" }}
            >
              <option value="none">无背景音 (Silence)</option>
              <option value="bell">铜磬钟鸣 (Temple Bell - 每 25s)</option>
              <option value="wind">五声风铃 (Windchimes - 随机)</option>
            </select>
          </div>

          {/* Breathing trainer guidance */}
          <div className="breath-trainer">
            <div className="breath-coach-ring">
              <div className="breath-coach-core" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                冥想深呼吸同步仪
              </span>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.3 }}>
                小球向外扩张时深吸气，向内收缩时深呼气。消解焦虑。
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
