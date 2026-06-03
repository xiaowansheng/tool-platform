"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

import { getWheelGeometry } from "./wheel-geometry";

interface WheelOption {
  label: string;
  weight: number;
}

const presets: Record<string, string> = {
  lunch: `黄焖鸡米饭 | 2
螺蛳粉 | 1
麻辣烫 | 2
沙县小吃 | 1
麦当劳 | 3
肯德基 | 2
便利店便当 | 1
减脂沙拉 | 1`,
  truthOrDare: `真心话 | 3
大冒险 | 3
喝一杯 | 2
自选惩罚 | 1
无罪释放 | 1`,
  coinFlip: `正面 | 1
反面 | 1`,
  dishwasher: `爸爸 | 1
妈妈 | 1
我 | 1
猜拳决定 | 1`
};

function hashSeed(seed: string) {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRandom(seed: string) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = Math.imul(value, 48271) % 0x7fffffff;
    return (value & 0x7fffffff) / 0x7fffffff;
  };
}

function parseOptions(input: string): WheelOption[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const labelPart = parts[0]?.trim() || "";
      const weightPart = parts[1]?.trim() || "";
      const weight = Number(weightPart);

      return {
        label: labelPart,
        weight: labelPart && Number.isFinite(weight) && weight > 0 ? weight : 1
      };
    })
    .filter((opt) => opt.label.length > 0);
}

function pickOptionIndex(options: WheelOption[], seed: string): number {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  if (totalWeight <= 0) return 0;
  const roll = seededRandom(seed)() * totalWeight;
  let cursor = 0;

  for (let i = 0; i < options.length; i++) {
    cursor += options[i].weight;
    if (roll <= cursor) {
      return i;
    }
  }

  return options.length - 1;
}

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

export default function DecisionWheelTool({ manifest }: ToolAppProps) {
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

  const [input, setInput] = useState(presets.lunch);
  const [seed, setSeed] = useState("lucky-spin");
  const [spinCount, setSpinCount] = useState(0);
  const [result, setResult] = useState<WheelOption | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Wheel animation states
  const [currentAngle, setCurrentAngle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasBoxRef = useRef({ width: 0, height: 0 });
  const [canvasResizeTick, setCanvasResizeTick] = useState(0);

  const options = useMemo(() => parseOptions(input), [input]);
  const totalWeight = useMemo(() => options.reduce((sum, o) => sum + o.weight, 0), [options]);
  const historyText = history.join("\n");

  // Play click sound using AudioContext
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  };

  // Generate stable color based on index and theme
  const getSectorColor = (index: number, total: number) => {
    const themeColors: Record<string, string[]> = {
      cyberpunk: ["#00f0ff", "#ff007f", "#9d00ff", "#fffb00", "#00ff66", "#ff5500"],
      retro: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#1a535c", "#f7fff7", "#ff9f1c"],
      forest: ["#2d5a27", "#606c38", "#283618", "#dda15e", "#bc6c25", "#588157"],
      sunset: ["#d62828", "#f77f00", "#fcbf49", "#eae2b7", "#457b9d", "#f15bb5"],
      cosmic: ["#1e1a3c", "#3c1b5b", "#6b11b7", "#b100e8", "#00e8e8", "#ec4899"]
    };

    const colors = themeColors[theme];
    if (colors) {
      return colors[index % colors.length];
    }
    
    // Default classic HSL color
    const h = (360 / total) * index;
    return `hsl(${h}, 70%, 62%)`;
  };

  // Draw the spin wheel on the canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const { cx, cy, radius } = getWheelGeometry(width, height);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (radius <= 0) {
      return;
    }

    if (options.length === 0) {
      // Draw placeholder
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = theme === "retro" ? "#1a1c1e" : "#2d2d30";
      ctx.fill();
      ctx.strokeStyle = theme === "retro" ? "#000000" : "#3f3f46";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#8e8e93";
      ctx.font = theme === "retro" ? "16px monospace" : "16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("请在左侧输入候选项", cx, cy);
      return;
    }

    let accumulatedAngle = angle;

    // Draw sectors
    options.forEach((option, idx) => {
      const sectorSize = (option.weight / totalWeight) * 2 * Math.PI;
      const start = accumulatedAngle;
      const end = accumulatedAngle + sectorSize;

      // Arc path
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();

      // Style
      ctx.fillStyle = getSectorColor(idx, options.length);
      ctx.fill();

      ctx.strokeStyle = theme === "retro" ? "#000000" : "#121214";
      ctx.lineWidth = theme === "retro" ? 3 : 1.5;
      ctx.stroke();

      // Label Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sectorSize / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = theme === "retro" ? "#000000" : "#ffffff";
      ctx.font = theme === "retro" ? "bold 13px monospace" : "bold 13px sans-serif";
      
      // Shadow for text readability (only if not retro)
      if (theme !== "retro") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4;
      }

      const displayText = option.label.length > 10 ? option.label.slice(0, 9) + "…" : option.label;
      ctx.fillText(displayText, radius - 15, 0);
      ctx.restore();

      accumulatedAngle = end;
    });

    // Draw outer boundary ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = themeConfig[theme]?.primary || "#ffe066";
    ctx.lineWidth = theme === "retro" ? 5 : 4;
    ctx.stroke();

    // Draw center hub / SPIN button background
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.fillStyle = themeConfig[theme]?.bgCard.startsWith("rgba") ? themeConfig[theme]?.bgPanel : themeConfig[theme]?.bgCard || "#1e1e24";
    
    if (theme !== "retro") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    
    ctx.strokeStyle = themeConfig[theme]?.primary || "#ffe066";
    ctx.lineWidth = theme === "retro" ? 4 : 3;
    ctx.stroke();

    // Draw SPIN text inside hub
    ctx.fillStyle = themeConfig[theme]?.primary || "#ffe066";
    ctx.font = theme === "retro" ? "bold 12px monospace" : "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);

    // Draw top pointer arrow
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - radius - 12);
    ctx.lineTo(cx + 10, cy - radius - 12);
    ctx.lineTo(cx, cy - radius + 8);
    ctx.closePath();
    ctx.fillStyle = themeConfig[theme]?.secondary || "#ff4d4f";
    if (theme !== "retro") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 3;
    }
    ctx.fill();
    ctx.strokeStyle = theme === "retro" ? "#000000" : "#ffffff";
    ctx.lineWidth = theme === "retro" ? 2.5 : 1.5;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      const previousBox = canvasBoxRef.current;

      if (previousBox.width === nextWidth && previousBox.height === nextHeight) {
        return;
      }

      canvasBoxRef.current = { width: nextWidth, height: nextHeight };
      setCanvasResizeTick((tick) => tick + 1);
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Re-draw wheel when options, currentAngle, theme, or canvas size changes
  useEffect(() => {
    drawWheel(currentAngle);
  }, [options, currentAngle, totalWeight, canvasResizeTick, theme]);

  // Handle spin logic
  const startSpin = () => {
    if (isSpinning) return;
    if (options.length === 0) {
      setError("至少输入一个合法的候选项。");
      return;
    }
    setError("");
    setCopied(false);
    setIsSpinning(true);

    const nextSpinCount = spinCount + 1;
    setSpinCount(nextSpinCount);

    const winningIdx = pickOptionIndex(options, `${seed}:${nextSpinCount}`);
    const winner = options[winningIdx];

    // Compute sectors angles on the wheel
    let startOfWinningSector = 0;
    for (let i = 0; i < winningIdx; i++) {
      startOfWinningSector += (options[i].weight / totalWeight) * 2 * Math.PI;
    }
    const sizeOfWinningSector = (winner.weight / totalWeight) * 2 * Math.PI;
    const midOfWinningSector = startOfWinningSector + sizeOfWinningSector / 2;

    // Pointer is at -Math.PI / 2 (top pointer)
    // To land winning sector at top pointer, the wheel angle should be:
    // targetAngle = -Math.PI/2 - midOfWinningSector
    // We add multiple full rotations (e.g. 5 to 8 rotations) for spinning speed
    const baseRotations = 6 * 2 * Math.PI;
    const targetAngle = -Math.PI / 2 - midOfWinningSector + baseRotations;

    // Animation variables
    const duration = 4000; // 4 seconds spin
    const startAngle = currentAngle % (2 * Math.PI); // Keep angle small
    const totalRotation = targetAngle - startAngle;

    const startTime = performance.now();

    // Easing out cubic: t = time / duration
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    // Audio click tracking
    let anglesPassed = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutCubic(progress);
      const angle = startAngle + totalRotation * easeProgress;

      setCurrentAngle(angle);

      // Play tick sound when passing sectors
      // Track sector ticks: calculate actual index under pointer
      const normalizedAngle = (angle + Math.PI / 2) % (2 * Math.PI);
      const currentPassedSectorCount = Math.floor(
        ((normalizedAngle < 0 ? normalizedAngle + 2 * Math.PI : normalizedAngle) / (2 * Math.PI)) * options.length * 4
      );
      if (currentPassedSectorCount !== anglesPassed) {
        playClickSound();
        anglesPassed = currentPassedSectorCount;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setResult(winner);
        setHistory((items) => [
          `${nextSpinCount}. ${winner.label} (权重 ${winner.weight})`,
          ...items
        ].slice(0, 20));
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const loadPreset = (key: string) => {
    if (isSpinning) return;
    setInput(presets[key] || "");
    setResult(null);
  };

  const copyHistory = async () => {
    try {
      await navigator.clipboard.writeText(historyText || (result?.label ?? ""));
      setCopied(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "复制失败");
    }
  };

  // Interactive builders for options
  const addOption = () => {
    if (isSpinning) return;
    setInput((prev) => prev.trim() + "\n新选项 | 1");
  };

  return (
    <section className={`tool-panel theme-${theme}`}>
      <style>{`
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
        <p style={{ marginTop: "0.5rem" }}>自定义候选项和权重，伴随逼真的旋转减速和咔哒声效，帮你轻松做出随机选择。</p>
      </div>

      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>预设模板：</span>
          <button type="button" disabled={isSpinning} onClick={() => loadPreset("lunch")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}>中午吃什么</button>
          <button type="button" disabled={isSpinning} onClick={() => loadPreset("truthOrDare")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}>真心话大冒险</button>
          <button type="button" disabled={isSpinning} onClick={() => loadPreset("coinFlip")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}>抛硬币</button>
          <button type="button" disabled={isSpinning} onClick={() => loadPreset("dishwasher")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}>谁洗碗</button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            🔊 声音反馈
          </label>
        </div>
      </div>

      <div className="tool-toolbar tool-toolbar--grid" style={{ marginBottom: "1.25rem" }}>
        <label className="tool-field tool-field--compact">
          <span>随机种子 (确保复现)</span>
          <input value={seed} disabled={isSpinning} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button type="button" disabled={isSpinning} onClick={() => setSeed(String(Date.now()).slice(-6))}>随机生成种子</button>
        <button
          type="button"
          className="btn-primary"
          disabled={isSpinning || options.length === 0}
          onClick={startSpin}
          style={{
            backgroundColor: themeConfig[theme]?.primary || "#ffe066",
            color: themeConfig[theme]?.buttonText || "#121214",
            fontWeight: "bold"
          }}
        >
          {isSpinning ? "旋转中..." : "开始旋转 (SPIN)"}
        </button>
        <button type="button" disabled={history.length === 0} onClick={copyHistory}>{copied ? "已复制" : "复制历史"}</button>
      </div>

      <div className="detail-grid" style={{ marginBottom: "1.5rem" }}>
        <article className="detail-card"><h3>候选项个数</h3><p>{options.length}</p></article>
        <article className="detail-card"><h3>总权重</h3><p>{totalWeight}</p></article>
        <article className="detail-card"><h3>累计抽取</h3><p>{spinCount} 次</p></article>
        <article className="detail-card" style={{ borderColor: result ? (themeConfig[theme]?.primary || "#ffe066") : "transparent" }}>
          <h3>最近结果</h3>
          <p style={{ color: result ? (themeConfig[theme]?.primary || "#ffe066") : "inherit", transition: "color 0.3s" }}>{result?.label ?? "-"}</p>
        </article>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {/* Left column: Wheel canvas */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: themeConfig[theme]?.bgCard || "#1e1e24",
          padding: "1.5rem",
          borderRadius: "8px",
          border: `1px solid ${themeConfig[theme]?.primary}22` || "1px solid #2d2d30",
          boxShadow: theme === "retro" ? "none" : `0 4px 20px ${themeConfig[theme]?.primary}0d`
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "340px", aspectRatio: "1 / 1" }}>
            <canvas
              ref={canvasRef}
              onClick={startSpin}
              style={{
                width: "100%",
                height: "100%",
                cursor: isSpinning ? "default" : "pointer",
                borderRadius: "50%",
                touchAction: "none"
              }}
            />
          </div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            {isSpinning ? (
              <p style={{ color: themeConfig[theme]?.primary || "#ffe066", fontStyle: "italic", animation: "pulse 1s infinite" }}>命运的指针正在转动...</p>
            ) : result ? (
              <div>
                <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>抽取结果：</p>
                <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: themeConfig[theme]?.primary || "#ffe066", margin: "0.25rem 0" }}>🎉 {result.label} 🎉</p>
                <p style={{ fontSize: "0.8rem", opacity: 0.5 }}>（权重：{result.weight}，占比：{((result.weight / totalWeight) * 100).toFixed(1)}%）</p>
              </div>
            ) : (
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>点击转盘中心或“开始旋转”抽取结果</p>
            )}
          </div>
        </div>

        {/* Right column: Edit area & History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="tool-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span>配置选项 (格式: 名称 | 权重)</span>
              <button type="button" disabled={isSpinning} onClick={addOption} style={{ padding: "2px 8px", fontSize: "0.8rem", background: "var(--bg-muted)", border: "1px solid var(--border-default)", borderRadius: "4px" }}>+ 增加候选项</button>
            </div>
            <textarea
              value={input}
              disabled={isSpinning}
              onChange={(e) => setInput(e.target.value)}
              placeholder="每行一个选项，例如：&#10;选项一 | 1&#10;选项二 | 2"
              rows={8}
              style={{ fontFamily: "monospace", fontSize: "0.9rem" }}
            />
          </label>

          <label className="tool-field">
            <span>抽取历史 (最新在前)</span>
            <textarea
              value={historyText}
              readOnly
              spellCheck={false}
              placeholder="暂无抽取历史"
              rows={6}
              style={{ fontSize: "0.9rem" }}
            />
          </label>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
      
      <div style={{
        marginTop: "1.5rem",
        padding: "1rem",
        background: themeConfig[theme]?.accentDim || "rgba(255, 224, 102, 0.05)",
        border: `1px dashed ${themeConfig[theme]?.primary}44` || "1px dashed rgba(255, 224, 102, 0.2)",
        borderRadius: "6px"
      }}>
        <p className="tool-note" style={{ margin: 0 }}>
          💡 <strong>提示：</strong>转盘扇区大小与权重成正比。若使用固定随机种子，每一次旋转的顺序 and 结果都完全相同（可复现），常用于教学或需要公平验证的抽签场景。
        </p>
      </div>
    </section>
  );
}
