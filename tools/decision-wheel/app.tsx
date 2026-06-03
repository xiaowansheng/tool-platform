"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

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

export default function DecisionWheelTool({ manifest }: ToolAppProps) {
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

  // Generate stable HSL color based on index
  const getSectorColor = (index: number, total: number) => {
    const h = (360 / total) * index;
    return `hsl(${h}, 70%, 62%)`;
  };

  // Draw the spin wheel on the canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and fix DPI blurriness
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, width, height);

    if (options.length === 0) {
      // Draw placeholder
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#2d2d30";
      ctx.fill();
      ctx.strokeStyle = "#3f3f46";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#8e8e93";
      ctx.font = "16px Inter, sans-serif";
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

      ctx.strokeStyle = "#121214";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sectorSize / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      // Shadow for text readability
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;

      const displayText = option.label.length > 10 ? option.label.slice(0, 9) + "…" : option.label;
      ctx.fillText(displayText, radius - 15, 0);
      ctx.restore();

      accumulatedAngle = end;
    });

    // Draw outer boundary ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw center hub / SPIN button background
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e1e24";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw SPIN text inside hub
    ctx.fillStyle = "#ffe066";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);

    // Draw top pointer arrow
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - radius - 12);
    ctx.lineTo(cx + 10, cy - radius - 12);
    ctx.lineTo(cx, cy - radius + 8);
    ctx.closePath();
    ctx.fillStyle = "#ff4d4f";
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 3;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  // Re-draw wheel when options or currentAngle changes
  useEffect(() => {
    drawWheel(currentAngle);
  }, [options, currentAngle, totalWeight]);

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
    let lastTickAngle = startAngle;

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
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">游戏娱乐工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>自定义候选项和权重，伴随逼真的旋转减速和咔哒声效，帮你轻松做出随机选择。</p>
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
        <button type="button" className="btn-primary" disabled={isSpinning || options.length === 0} onClick={startSpin} style={{ backgroundColor: "#ffe066", color: "#121214", fontWeight: "bold" }}>
          {isSpinning ? "旋转中..." : "开始旋转 (SPIN)"}
        </button>
        <button type="button" disabled={history.length === 0} onClick={copyHistory}>{copied ? "已复制" : "复制历史"}</button>
      </div>

      <div className="detail-grid" style={{ marginBottom: "1.5rem" }}>
        <article className="detail-card"><h3>候选项个数</h3><p>{options.length}</p></article>
        <article className="detail-card"><h3>总权重</h3><p>{totalWeight}</p></article>
        <article className="detail-card"><h3>累计抽取</h3><p>{spinCount} 次</p></article>
        <article className="detail-card" style={{ borderColor: result ? "#ffe066" : "transparent" }}>
          <h3>最近结果</h3>
          <p style={{ color: result ? "#ffe066" : "inherit", transition: "color 0.3s" }}>{result?.label ?? "-"}</p>
        </article>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        {/* Left column: Wheel canvas */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#1e1e24", padding: "1.5rem", borderRadius: "8px", border: "1px solid #2d2d30" }}>
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
              <p style={{ color: "#ffe066", fontStyle: "italic", animation: "pulse 1s infinite" }}>命运的指针正在转动...</p>
            ) : result ? (
              <div>
                <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>抽取结果：</p>
                <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#ffe066", margin: "0.25rem 0" }}>🎉 {result.label} 🎉</p>
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
              <button type="button" disabled={isSpinning} onClick={addOption} style={{ padding: "2px 8px", fontSize: "0.8rem", background: "#333", border: "1px solid #444", borderRadius: "4px" }}>+ 增加候选项</button>
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
      
      <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(255, 224, 102, 0.05)", border: "1px dashed rgba(255, 224, 102, 0.2)", borderRadius: "6px" }}>
        <p className="tool-note" style={{ margin: 0 }}>
          💡 <strong>提示：</strong>转盘扇区大小与权重成正比。若使用固定随机种子，每一次旋转的顺序和结果都完全相同（可复现），常用于教学或需要公平验证的抽签场景。
        </p>
      </div>
    </section>
  );
}
