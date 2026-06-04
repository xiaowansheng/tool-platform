"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// Beat data item representing a single tap
interface TapRecord {
  id: string;
  timestamp: number; // millisecond timestamp (relative to start or absolute)
}

// Result of beat analysis
interface AnalysisResult {
  totalTaps: number;
  duration: number; // in seconds
  avgInterval: number; // in ms
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  stdDev: number; // in ms
  cv: number; // coefficient of variation
  stabilityScore: number; // 0 - 100
  regularityLabel: string; // e.g. "完美规律", "非常规律"
  regularityColor: string; // CSS color
  trendSlope: number; // slope of interval changes
  trendLabel: string; // "加速", "减速", "稳定"
  rhythmPattern: string; // "均匀节奏", "摇摆乐/附点节奏 (Swing)", "三拍子节奏 (Waltz)", "无规律/复杂节奏"
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

// Play a synthesized tick/beep sound for tactile feedback
const playClickSound = (freq = 800, duration = 0.08, volume = 0.3) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.error("Audio playback error:", err);
  }
};

export default function BeatAnalyzerTool({ manifest }: ToolAppProps) {
  // --- States ---
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [taps, setTaps] = useState<TapRecord[]>([]);
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);
  
  // Metronome Guide state
  const [metronomeActive, setMetronomeActive] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(120);

  // Analysis panel state (active or idle)
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "details">("dashboard");
  const [chartMetric, setChartMetric] = useState<"bpm" | "interval">("bpm");

  // Interaction feedback states
  const [padActive, setPadActive] = useState<boolean>(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleIdRef = useRef<number>(0);

  // Refs for tracking start time and metronome timer
  const recordingStartTimeRef = useRef<number>(0);
  const metronomeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Keyboard & Tapping logic ---
  const handleTap = (clientX?: number, clientY?: number, containerEl?: HTMLDivElement) => {
    const now = performance.now();
    playClickFeedback();

    // Trigger visual pad active state
    setPadActive(true);
    setTimeout(() => setPadActive(false), 80);

    // Spawn ripple if coordinates are provided
    if (clientX !== undefined && clientY !== undefined && containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }

    setTaps((prev) => {
      // Auto-start recording on the first tap
      if (!isRecording && prev.length === 0) {
        setIsRecording(true);
        recordingStartTimeRef.current = now;
      }
      
      const newTap: TapRecord = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: now
      };
      return [...prev, newTap];
    });
  };

  const playClickFeedback = () => {
    if (audioFeedback) {
      playClickSound(880, 0.06, 0.25); // high pitch tick
    }
  };

  // Keyboard Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // Prevent default scrolling unless typing in inputs
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, audioFeedback]);

  // Metronome Sound Timer Loop
  useEffect(() => {
    if (metronomeActive) {
      const intervalMs = 60000 / metronomeBpm;
      let nextTick = performance.now();

      const tick = () => {
        playClickSound(1200, 0.08, 0.2); // Metronome click
        nextTick += intervalMs;
        const delay = Math.max(0, nextTick - performance.now());
        metronomeTimerRef.current = setTimeout(tick, delay);
      };

      metronomeTimerRef.current = setTimeout(tick, 0);
    } else {
      if (metronomeTimerRef.current) {
        clearTimeout(metronomeTimerRef.current);
      }
    }

    return () => {
      if (metronomeTimerRef.current) {
        clearTimeout(metronomeTimerRef.current);
      }
    };
  }, [metronomeActive, metronomeBpm]);

  // --- Action Handlers ---
  const startRecording = () => {
    setTaps([]);
    setIsRecording(true);
    setHasAnalyzed(false);
    recordingStartTimeRef.current = performance.now();
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (taps.length >= 3) {
      setHasAnalyzed(true);
    }
  };

  const resetRecording = () => {
    setTaps([]);
    setIsRecording(false);
    setHasAnalyzed(false);
    setMetronomeActive(false);
  };

  const deleteTap = (id: string) => {
    setTaps((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length < 3) {
        setHasAnalyzed(false);
      }
      return filtered;
    });
  };

  // --- Statistical Calculations ---
  const analysis = useMemo((): AnalysisResult | null => {
    if (taps.length < 3) return null;

    const start = taps[0].timestamp;
    const duration = (taps[taps.length - 1].timestamp - start) / 1000;

    // Calculate intervals between adjacent taps
    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].timestamp - taps[i - 1].timestamp);
    }

    const totalTaps = taps.length;
    const avgInterval = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
    const avgBpm = 60000 / avgInterval;

    // Calculate instantaneous BPMs for each interval
    const bpms = intervals.map((v) => 60000 / v);
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);

    // Calculate standard deviation of intervals
    const variance = intervals.reduce((acc, v) => acc + Math.pow(v - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgInterval; // coefficient of variation

    // Map CV to Stability Score
    let stabilityScore = 0;
    let regularityLabel = "";
    let regularityColor = "";

    if (cv <= 0.02) {
      stabilityScore = Math.round(100 - (cv / 0.02) * 2);
      regularityLabel = "完美规律 (Pro Master)";
      regularityColor = "var(--accent-primary)"; // Teal
    } else if (cv <= 0.05) {
      stabilityScore = Math.round(98 - ((cv - 0.02) / 0.03) * 8);
      regularityLabel = "非常规律 (Super Steady)";
      regularityColor = "var(--accent-success)"; // Emerald
    } else if (cv <= 0.10) {
      stabilityScore = Math.round(90 - ((cv - 0.05) / 0.05) * 15);
      regularityLabel = "基本规律 (Steady)";
      regularityColor = "var(--accent-secondary)"; // Sky Blue
    } else if (cv <= 0.18) {
      stabilityScore = Math.round(75 - ((cv - 0.10) / 0.08) * 25);
      regularityLabel = "轻微杂乱 (Fluctuating)";
      regularityColor = "var(--accent-warning)"; // Amber
    } else {
      stabilityScore = Math.max(0, Math.round(50 - ((cv - 0.18) / 0.22) * 50));
      regularityLabel = "杂乱无章 (Irregular/Chaotic)";
      regularityColor = "var(--accent-danger)"; // Rose Red
    }

    // Trend Analysis (Linear Regression slope of interval changes)
    const n = intervals.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = intervals[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const trendSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const relativeTrend = (trendSlope * n) / avgInterval;

    let trendLabel = "稳定 (Stable Tempo)";
    if (relativeTrend < -0.05) {
      trendLabel = "加速倾向 (Rushing / Speeding up)";
    } else if (relativeTrend > 0.05) {
      trendLabel = "减速倾向 (Dragging / Slowing down)";
    }

    // Rhythm Pattern Recognition (swing, waltz, or flat rhythm)
    let rhythmPattern = "均匀节奏 (Straight Beat)";
    if (n >= 4) {
      // 1. Check for alternating intervals (Swing / Shuffle)
      // e.g. Long, Short, Long, Short...
      let alternatingDiffs = 0;
      let straightDiffs = 0;
      for (let i = 1; i < n; i++) {
        const diffPercent = Math.abs(intervals[i] - intervals[i - 1]) / avgInterval;
        if (i % 2 === 1) {
          alternatingDiffs += diffPercent;
        } else {
          straightDiffs += diffPercent;
        }
      }

      // Calculate separate CVs for odd and even positions
      const odds = intervals.filter((_, idx) => idx % 2 === 0);
      const evens = intervals.filter((_, idx) => idx % 2 === 1);
      
      const avgOdd = odds.reduce((a, b) => a + b, 0) / odds.length;
      const avgEven = evens.reduce((a, b) => a + b, 0) / evens.length;
      
      const varOdd = odds.reduce((a, b) => a + Math.pow(b - avgOdd, 2), 0) / odds.length;
      const varEven = evens.reduce((a, b) => a + Math.pow(b - avgEven, 2), 0) / evens.length;
      
      const cvOdd = Math.sqrt(varOdd) / avgOdd;
      const cvEven = Math.sqrt(varEven) / avgEven;

      const oddEvenRatio = Math.max(avgOdd / avgEven, avgEven / avgOdd);

      if (cvOdd < 0.07 && cvEven < 0.07 && oddEvenRatio > 1.3) {
        rhythmPattern = "摇摆乐/附点节奏 (Swing / Shuffle)";
      } else if (n >= 6) {
        // 2. Check for triple-beat patterns (Waltz / 3-beat rhythm)
        // e.g. Long, Short, Short, Long, Short, Short...
        // Let's check autocorrelation with lag 3
        let lag3Sum = 0;
        for (let i = 3; i < n; i++) {
          lag3Sum += Math.abs(intervals[i] - intervals[i - 3]);
        }
        const avgLag3Diff = lag3Sum / (n - 3);
        if (avgLag3Diff / avgInterval < 0.07 && cv > 0.12) {
          rhythmPattern = "三拍子节奏 (Waltz / Triplets)";
        }
      }
    }

    if (cv > 0.20 && rhythmPattern === "均匀节奏 (Straight Beat)") {
      rhythmPattern = "无规律/复杂节奏 (Irregular / Complex)";
    }

    return {
      totalTaps,
      duration,
      avgInterval,
      avgBpm,
      minBpm,
      maxBpm,
      stdDev,
      cv,
      stabilityScore,
      regularityLabel,
      regularityColor,
      trendSlope,
      trendLabel,
      rhythmPattern
    };
  }, [taps]);

  // Live estimated BPM calculation (using last 4 taps)
  const liveBpm = useMemo(() => {
    if (taps.length < 2) return null;
    const recentTaps = taps.slice(-4);
    const intervals = [];
    for (let i = 1; i < recentTaps.length; i++) {
      intervals.push(recentTaps[i].timestamp - recentTaps[i - 1].timestamp);
    }
    const avg = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
    return Math.round(60000 / avg);
  }, [taps]);

  // Generate SVG path for the line trend chart
  const renderTrendChart = () => {
    if (taps.length < 3 || !analysis) return null;

    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].timestamp - taps[i - 1].timestamp);
    }

    const data = chartMetric === "bpm" 
      ? intervals.map((v) => 60000 / v) 
      : intervals;

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = 500;
    const height = 180;

    const xMax = width - margin.left - margin.right;
    const yMax = height - margin.top - margin.bottom;

    const minVal = Math.min(...data) * 0.95;
    const maxVal = Math.max(...data) * 1.05;
    const valRange = maxVal - minVal || 1;

    const getX = (idx: number) => margin.left + (idx / (data.length - 1 || 1)) * xMax;
    const getY = (val: number) => margin.top + yMax - ((val - minVal) / valRange) * yMax;

    // Build path string
    let pathD = "";
    let areaD = "";
    data.forEach((val, idx) => {
      const x = getX(idx);
      const y = getY(val);
      if (idx === 0) {
        pathD = `M ${x} ${y}`;
        areaD = `M ${x} ${margin.top + yMax} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        if (idx === data.length - 1) {
          areaD += ` L ${x} ${y} L ${x} ${margin.top + yMax} Z`;
        } else {
          areaD += ` L ${x} ${y}`;
        }
      }
    });

    const averageVal = chartMetric === "bpm" ? analysis.avgBpm : analysis.avgInterval;
    const avgY = getY(averageVal);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="beat-chart-svg">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const val = minVal + r * valRange;
          const y = getY(val);
          return (
            <g key={r} opacity="0.15">
              <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="var(--text-primary)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="9">
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Horizontal Average Line */}
        <line
          x1={margin.left}
          y1={avgY}
          x2={width - margin.right}
          y2={avgY}
          stroke="var(--accent-secondary)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.8"
        />
        <text x={width - margin.right - 4} y={avgY - 6} fill="var(--accent-secondary)" fontSize="9" textAnchor="end" fontWeight="600">
          均值: {Math.round(averageVal)} {chartMetric === "bpm" ? "BPM" : "ms"}
        </text>

        {/* Filled Area */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Value Line */}
        <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data Circles */}
        {data.map((val, idx) => (
          <circle
            key={idx}
            cx={getX(idx)}
            cy={getY(val)}
            r="4"
            fill="var(--bg-base)"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            className="chart-dot"
          >
            <title>
              击拍 {idx + 1}: {Math.round(val)} {chartMetric === "bpm" ? "BPM" : "ms"}
            </title>
          </circle>
        ))}

        {/* X Axis labels */}
        <line x1={margin.left} y1={margin.top + yMax} x2={width - margin.right} y2={margin.top + yMax} stroke="var(--border-default)" strokeWidth="1" />
        {data.map((_, idx) => {
          // Label every N beats to avoid clutter
          const labelStep = Math.max(1, Math.round(data.length / 8));
          if (idx % labelStep !== 0 && idx !== data.length - 1) return null;
          return (
            <text key={idx} x={getX(idx)} y={margin.top + yMax + 14} fill="var(--text-tertiary)" fontSize="9" textAnchor="middle">
              #{idx + 1}
            </text>
          );
        })}
      </svg>
    );
  };

  // Generate SVG histogram chart for Interval Distribution
  const renderDistributionChart = () => {
    if (taps.length < 3 || !analysis) return null;

    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].timestamp - taps[i - 1].timestamp);
    }

    const mean = analysis.avgInterval;

    // Calculate absolute deviation from mean in percent
    const deviations = intervals.map((v) => ((v - mean) / mean) * 100);

    // Set bins: -15% to -10%, -10% to -5%, -5% to -2%, -2% to 2%, 2% to 5%, 5% to 10%, 10% to 15%
    const binBoundaries = [-12, -7, -3, 3, 7, 12];
    const binLabels = ["<-12%", "-12~-7%", "-7~-3%", "±3%以内", "3~7%", "7~12%", ">12%"];
    const counts = Array(7).fill(0);

    deviations.forEach((dev) => {
      if (dev < binBoundaries[0]) counts[0]++;
      else if (dev < binBoundaries[1]) counts[1]++;
      else if (dev < binBoundaries[2]) counts[2]++;
      else if (dev < binBoundaries[3]) counts[3]++;
      else if (dev < binBoundaries[4]) counts[4]++;
      else if (dev < binBoundaries[5]) counts[5]++;
      else counts[6]++;
    });

    const maxCount = Math.max(...counts, 1);

    const width = 500;
    const height = 150;
    const margin = { top: 15, right: 20, bottom: 25, left: 30 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const barWidth = chartWidth / counts.length;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="beat-chart-svg">
        <line x1={margin.left} y1={margin.top + chartHeight} x2={width - margin.right} y2={margin.top + chartHeight} stroke="var(--border-default)" strokeWidth="1" />

        {counts.map((count, idx) => {
          const barHeight = (count / maxCount) * chartHeight;
          const x = margin.left + idx * barWidth + 4;
          const y = margin.top + chartHeight - barHeight;
          const actualBarWidth = barWidth - 8;

          // Highlight the center (perfect timing) bin
          const isCenter = idx === 3;
          const fill = isCenter 
            ? "var(--accent-primary)" 
            : count > 0 
              ? "var(--accent-secondary)" 
              : "var(--bg-muted)";

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={Math.max(barHeight, 2)}
                rx="4"
                fill={fill}
                opacity={count > 0 ? 0.85 : 0.25}
                className="bar-rect"
              />
              {count > 0 && (
                <text x={x + actualBarWidth / 2} y={y - 4} fill="var(--text-primary)" fontSize="9" textAnchor="middle" fontWeight="600">
                  {count}
                </text>
              )}
              <text x={x + actualBarWidth / 2} y={margin.top + chartHeight + 14} fill="var(--text-secondary)" fontSize="8.5" textAnchor="middle">
                {binLabels[idx]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Render Grid Sequencer Visualizer
  const renderSequencerGrid = () => {
    if (taps.length < 2 || !analysis) return null;

    const start = taps[0].timestamp;
    const totalTimeMs = taps[taps.length - 1].timestamp - start;
    const avg = analysis.avgInterval;

    // Create theoretical grid beats at perfect intervals
    const gridBeatsCount = Math.ceil(totalTimeMs / avg) + 1;
    const perfectGrid = Array.from({ length: gridBeatsCount }, (_, i) => i * avg);

    const width = 500;
    const height = 80;
    const margin = { left: 20, right: 20 };
    const chartWidth = width - margin.left - margin.right;

    const getX = (timeMs: number) => margin.left + (timeMs / (totalTimeMs || 1)) * chartWidth;

    return (
      <div className="sequencer-container">
        <p className="sequencer-title">
          敲击时间轴对比 (绿色为高契合度，黄色为轻微偏差，红色为明显偏差)
        </p>
        <svg viewBox={`0 0 ${width} ${height}`} className="sequencer-svg">
          {/* Main axis timeline */}
          <line x1={margin.left} y1={height / 2} x2={width - margin.right} y2={height / 2} stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" />

          {/* Theoretical perfect grid markers (downward grey ticks) */}
          {perfectGrid.map((time, idx) => {
            const x = getX(time);
            if (x > width - margin.right + 2) return null;
            return (
              <g key={`grid-${idx}`}>
                <line x1={x} y1={height / 2} x2={x} y2={height / 2 + 12} stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                <circle cx={x} cy={height / 2 + 12} r="2" fill="var(--text-tertiary)" opacity="0.6" />
              </g>
            );
          })}

          {/* Actual user taps (upward colored tick pins) */}
          {taps.map((tap, idx) => {
            const tapTime = tap.timestamp - start;
            const x = getX(tapTime);

            // Find closest theoretical beat
            let minDiff = Infinity;
            perfectGrid.forEach((gridTime) => {
              const d = Math.abs(tapTime - gridTime);
              if (d < minDiff) minDiff = d;
            });

            // Calculate percentage deviation
            const devPercent = minDiff / avg;
            let pinColor = "var(--accent-primary)"; // Teal: close
            if (devPercent > 0.15) pinColor = "var(--accent-danger)"; // Rose: far
            else if (devPercent > 0.05) pinColor = "var(--accent-warning)"; // Amber: moderate

            return (
              <g key={tap.id}>
                {/* Visual pin line */}
                <line x1={x} y1={height / 2} x2={x} y2={height / 2 - 16} stroke={pinColor} strokeWidth="2" />
                {/* Visual pin head */}
                <circle cx={x} cy={height / 2 - 16} r="4" fill={pinColor} className="sequencer-pin" />
                {/* Tap Index */}
                <text x={x} y={height / 2 - 24} fill="var(--text-secondary)" fontSize="8.5" textAnchor="middle" fontWeight="bold">
                  {idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="sequencer-legend">
          <span>虚线/小圆点：理想节拍点</span>
          <span>实线/大圆点：您的敲击点</span>
        </div>
      </div>
    );
  };

  return (
    <section className="tool-panel">
      {/* Scope variables for CSS */}
      <style>{`
        /* --- Tool Specific Premium Styles --- */
        .tap-workspace-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: 1.1fr 0.9fr;
          margin-top: 1.25rem;
        }

        @media (max-width: 900px) {
          .tap-workspace-grid {
            grid-template-columns: 1fr;
          }
        }

        .premium-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
        }

        .premium-card:hover {
          border-color: var(--border-strong);
        }

        /* Large Tapping target pad */
        .tap-pad-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: rgba(6, 14, 22, 0.45);
          border: 1px dashed var(--border-default);
          border-radius: var(--radius-xl);
          overflow: hidden;
          min-height: 280px;
          user-select: none;
        }

        .tap-pad {
          position: relative;
          width: 170px;
          height: 170px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--bg-muted) 0%, var(--bg-subtle) 100%);
          border: 4px solid var(--border-strong);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.08s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.05);
          z-index: 5;
        }

        .tap-pad:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 10px 30px rgba(94, 234, 212, 0.12), inset 0 2px 4px rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        .tap-pad:active, .tap-pad.is-active {
          transform: scale(0.94);
          border-color: var(--accent-secondary);
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.2), inset 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .tap-pad-pulse {
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border-radius: var(--radius-full);
          border: 2px solid var(--accent-primary);
          opacity: 0;
        }

        .is-recording .tap-pad-pulse {
          animation: pad-pulse-anim 1.8s infinite cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes pad-pulse-anim {
          0% {
            transform: scale(0.98);
            opacity: 0.65;
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
          }
        }

        .tap-pad-text {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .tap-pad-subtext {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        /* Keyboard active key visualization */
        .keyboard-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
          font-family: monospace;
          font-size: 0.78rem;
          color: var(--text-secondary);
          box-shadow: 0 2px 0 var(--border-strong);
          margin-top: 1rem;
          z-index: 2;
        }

        /* Floating interactive ripple circles */
        .tap-ripple {
          position: absolute;
          border-radius: var(--radius-full);
          background: rgba(94, 234, 212, 0.18);
          transform: translate(-50%, -50%) scale(0);
          pointer-events: none;
          z-index: 1;
          animation: ripple-anim 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }

        @keyframes ripple-anim {
          to {
            transform: translate(-50%, -50%) scale(5);
            opacity: 0;
          }
        }

        /* Toggle Button Group */
        .tab-toggle-group {
          display: flex;
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          padding: 3px;
          width: fit-content;
        }

        .tab-toggle-btn {
          border-radius: var(--radius-full);
          border: none !important;
          background: transparent !important;
          color: var(--text-secondary);
          font-size: 0.8rem;
          padding: 4px 14px;
          transition: color var(--duration-fast), background var(--duration-fast);
          transform: none !important;
          box-shadow: none !important;
        }

        .tab-toggle-btn.is-active {
          background: var(--bg-muted) !important;
          color: var(--text-primary);
          font-weight: 600;
        }

        /* Summary Dashboard Metrics */
        .metrics-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .metric-tile {
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-tile-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .metric-tile-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.15;
        }

        .metric-tile-sub {
          font-size: 0.72rem;
          color: var(--text-tertiary);
        }

        .diagnostic-card {
          border-left: 4px solid var(--accent-secondary);
          background: rgba(56, 189, 248, 0.04);
          padding: 0.9rem 1.1rem;
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          font-size: 0.82rem;
          color: var(--text-primary);
          line-height: 1.45;
        }

        /* SVG Charts container styling */
        .chart-box {
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chart-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .beat-chart-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        .chart-dot {
          cursor: pointer;
          transition: r 0.15s ease, fill 0.15s ease;
        }

        .chart-dot:hover {
          r: 6;
          fill: var(--accent-secondary);
        }

        .bar-rect {
          transition: transform 0.25s ease, opacity 0.25s ease;
        }

        .bar-rect:hover {
          opacity: 1 !important;
          transform: translateY(-2px);
        }

        /* Sequencer View Styles */
        .sequencer-container {
          background: var(--bg-inset);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sequencer-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .sequencer-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        .sequencer-pin {
          transition: transform 0.15s ease, r 0.15s ease;
          cursor: help;
        }

        .sequencer-pin:hover {
          transform: scale(1.3);
          r: 5;
        }

        .sequencer-legend {
          display: flex;
          gap: 12px;
          font-size: 0.72rem;
          color: var(--text-tertiary);
          justify-content: center;
        }

        /* Scrollable Beat Log Table */
        .beat-log-table-wrapper {
          max-height: 290px;
          overflow-y: auto;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-inset);
        }

        .beat-log-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }

        .beat-log-table th {
          position: sticky;
          top: 0;
          background: var(--bg-muted);
          color: var(--text-secondary);
          padding: 8px 12px;
          font-weight: 600;
          border-bottom: 1px solid var(--border-default);
          z-index: 2;
        }

        .beat-log-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .beat-log-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .delete-beat-btn {
          border: 1px solid transparent !important;
          background: transparent !important;
          color: var(--accent-danger);
          padding: 2px 6px !important;
          border-radius: var(--radius-sm);
          font-size: 0.72rem;
          min-width: 0;
        }

        .delete-beat-btn:hover {
          background: rgba(244, 63, 94, 0.15) !important;
          border-color: rgba(244, 63, 94, 0.25) !important;
        }

        /* Sound Guide metronome widget */
        .assist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: rgba(6, 14, 22, 0.3);
          border: 1px solid var(--border-subtle);
          padding: 0.85rem;
          border-radius: var(--radius-md);
        }

        .guide-status-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-tertiary);
        }

        .status-dot.is-active {
          background: var(--accent-primary);
          box-shadow: 0 0 8px var(--accent-primary);
          animation: dot-blink 1.2s infinite ease-in-out;
        }

        @keyframes dot-blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Header Copy */}
      <div className="tool-panel__header">
        <p className="eyebrow">视频音频</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>

      <div className="tap-workspace-grid">
        {/* ==================================================== */}
        {/* LEFT COLUMN: Beat Input / Click Pad / Metronome Assist */}
        {/* ==================================================== */}
        <div className="premium-card">
          <h3 className="section-title" style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
            节拍录入区
          </h3>

          {/* Interactive Click Pad */}
          <div 
            className={`tap-pad-container ${isRecording ? "is-recording" : ""}`}
            onMouseDown={(e) => {
              if (e.button === 0) { // Left click only
                const container = e.currentTarget;
                handleTap(e.clientX, e.clientY, container);
              }
            }}
          >
            {/* Pulsing ring indicator (animation active during recording) */}
            <div className="tap-pad-pulse"></div>

            {/* Click target pad circle */}
            <div className={`tap-pad ${padActive ? "is-active" : ""}`}>
              <span className="tap-pad-text">
                {taps.length === 0 ? "点击此处" : `已录入 ${taps.length} 拍`}
              </span>
              <span className="tap-pad-subtext">
                {isRecording ? "配合你的节奏点击" : "或按键盘「空格键」"}
              </span>
            </div>

            {/* Interactive Ripple Elements */}
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="tap-ripple"
                style={{ left: ripple.x, top: ripple.y }}
              />
            ))}

            {/* Space key indicator */}
            <div className="keyboard-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 17v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2" />
              </svg>
              <span>[SPACE] 空格键已激活</span>
            </div>
          </div>

          {/* Guide status indicator */}
          <div className="guide-status-bar">
            <div className={`status-dot ${isRecording ? "is-active" : ""}`} />
            <span>
              {isRecording 
                ? `正在记录... 时长: ${taps.length > 0 ? ((performance.now() - recordingStartTimeRef.current) / 1000).toFixed(1) : "0.0"}秒`
                : taps.length > 0 
                  ? `已停止记录，共录入 ${taps.length} 组节拍。` 
                  : "等待首次敲击开始记录..."
              }
            </span>
          </div>

          {/* Real-time Tapping Feedbacks */}
          {liveBpm !== null && (
            <div className="metrics-summary-grid">
              <div className="metric-tile" style={{ border: "1px solid var(--accent-primary-dim)", background: "rgba(94, 234, 212, 0.02)" }}>
                <span className="metric-tile-label">当前实时估算 BPM</span>
                <span className="metric-tile-value" style={{ color: "var(--accent-primary)" }}>{liveBpm}</span>
                <span className="metric-tile-sub">基于最近 4 拍均值计算</span>
              </div>
              <div className="metric-tile">
                <span className="metric-tile-label">前一拍间隔时间</span>
                <span className="metric-tile-value">
                  {taps.length >= 2 
                    ? Math.round(taps[taps.length - 1].timestamp - taps[taps.length - 2].timestamp) 
                    : "--"
                  } <span style={{ fontSize: "0.85rem", fontWeight: "normal" }}>ms</span>
                </span>
                <span className="metric-tile-sub">敲击时间戳差值</span>
              </div>
            </div>
          )}

          {/* Action Control Row */}
          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            {isRecording ? (
              <button 
                type="button" 
                onClick={stopRecording} 
                className="button--primary" 
                style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-full)" }}
                disabled={taps.length < 3}
              >
                停止并生成分析报告
              </button>
            ) : (
              <button 
                type="button" 
                onClick={startRecording} 
                className="button--primary" 
                style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-full)" }}
              >
                重新开始记录
              </button>
            )}

            <button 
              type="button" 
              onClick={resetRecording} 
              className="button--danger" 
              style={{ padding: "10px 18px", borderRadius: "var(--radius-full)" }}
            >
              清空
            </button>
          </div>

          {/* Metronome Assist Panel */}
          <div className="assist-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                听觉反馈与辅助
              </span>
              <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", margin: 0 }}>
                开启节拍引导，帮助稳定敲击
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={audioFeedback} 
                  onChange={(e) => setAudioFeedback(e.target.checked)} 
                />
                <span>敲击音效反馈</span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={metronomeActive} 
                  onChange={(e) => setMetronomeActive(e.target.checked)} 
                />
                <span style={{ fontWeight: metronomeActive ? "bold" : "normal" }}>引导节拍器开关</span>
              </label>
            </div>

            {metronomeActive && (
              <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }} className="tool-field">
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>引导速度: {metronomeBpm} BPM</span>
                <input 
                  type="range" 
                  min="40" 
                  max="240" 
                  value={metronomeBpm} 
                  onChange={(e) => setMetronomeBpm(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: Results Dashboard / Detailed Log List */}
        {/* ==================================================== */}
        <div className="premium-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="section-title" style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
              数据统计与分析
            </h3>

            {/* Toggle dashboard vs details log */}
            {hasAnalyzed && (
              <div className="tab-toggle-group">
                <button
                  type="button"
                  className={`tab-toggle-btn ${activeTab === "dashboard" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  可视化简报
                </button>
                <button
                  type="button"
                  className={`tab-toggle-btn ${activeTab === "details" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("details")}
                >
                  拍频记录明细
                </button>
              </div>
            )}
          </div>

          {!hasAnalyzed ? (
            /* Empty State Guidance */
            <div 
              style={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                textAlign: "center", 
                minHeight: "340px", 
                color: "var(--text-secondary)",
                padding: "2rem",
                background: "rgba(6, 14, 22, 0.2)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)"
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" style={{ marginBottom: "1rem" }}>
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", margin: "0 0 6px 0" }}>
                等待生成数据报告
              </p>
              <p style={{ fontSize: "0.78rem", maxWidth: "260px", margin: 0, lineHeight: 1.45 }}>
                请连续敲击至少 <strong style={{ color: "var(--accent-primary)" }}>3 次</strong> 节奏，并点击停止记录以激活详细报告与图表分析。
              </p>
            </div>
          ) : (
            /* Analysis Display Panels */
            analysis && (
              <>
                {activeTab === "dashboard" ? (
                  /* TAB 1: Visual charts and metrics summary */
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    {/* General Metrics Tiles */}
                    <div className="metrics-summary-grid">
                      <div className="metric-tile" style={{ borderLeft: "4px solid var(--accent-primary)" }}>
                        <span className="metric-tile-label">平均速率 (Average Tempo)</span>
                        <span className="metric-tile-value" style={{ color: "var(--accent-primary)" }}>
                          {analysis.avgBpm.toFixed(1)} <span style={{ fontSize: "0.85rem", fontWeight: "normal" }}>BPM</span>
                        </span>
                        <span className="metric-tile-sub">均值间隔: {Math.round(analysis.avgInterval)} ms</span>
                      </div>

                      <div className="metric-tile" style={{ borderLeft: `4px solid ${analysis.regularityColor}` }}>
                        <span className="metric-tile-label">节奏稳定性 (Stability)</span>
                        <span className="metric-tile-value" style={{ color: analysis.regularityColor }}>
                          {analysis.stabilityScore}%
                        </span>
                        <span className="metric-tile-sub">状态: {analysis.regularityLabel}</span>
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="metrics-summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                      <div className="metric-tile">
                        <span className="metric-tile-label">录入拍数</span>
                        <span className="metric-tile-value" style={{ fontSize: "1.25rem" }}>{analysis.totalTaps} 拍</span>
                      </div>
                      <div className="metric-tile">
                        <span className="metric-tile-label">偏差标准差</span>
                        <span className="metric-tile-value" style={{ fontSize: "1.25rem" }}>±{analysis.stdDev.toFixed(1)}ms</span>
                      </div>
                      <div className="metric-tile">
                        <span className="metric-tile-label">BPM范围</span>
                        <span className="metric-tile-value" style={{ fontSize: "1.1rem" }}>
                          {Math.round(analysis.minBpm)}~{Math.round(analysis.maxBpm)}
                        </span>
                      </div>
                    </div>

                    {/* Analytical Diagnoses Narrative */}
                    <div className="diagnostic-card">
                      <div style={{ fontWeight: "bold", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>律动特征诊断报告</span>
                      </div>
                      <div>
                        本轮记录的节奏类型为 <strong>{analysis.rhythmPattern}</strong>，速度走势呈 <strong>{analysis.trendLabel}</strong>。
                        {analysis.stabilityScore >= 90 ? (
                          <span> 你的微时间感极其优异，对特定节奏的把握极其稳固，甚至可以比拟高水准打击乐器演奏者的微小起伏偏差值。</span>
                        ) : analysis.stabilityScore >= 75 ? (
                          <span> 你的节奏控制能力良好，敲击整体均称稳定，微小波动在正常人体生理容许的合理音乐律动波动范围内。</span>
                        ) : (
                          <span> 录音显示间隔波动起伏较多。建议开启「引导节拍器开关」，跟从规律节拍声练习敲打以逐步提高肌肉记忆的精确度。</span>
                        )}
                      </div>
                    </div>

                    {/* SVG Interactive Trend Graph */}
                    <div className="chart-box">
                      <div className="chart-header">
                        <span className="chart-title">节拍趋势变化曲线</span>
                        <div className="tab-toggle-group" style={{ padding: "2px" }}>
                          <button
                            type="button"
                            className={`tab-toggle-btn ${chartMetric === "bpm" ? "is-active" : ""}`}
                            onClick={() => setChartMetric("bpm")}
                            style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                          >
                            BPM
                          </button>
                          <button
                            type="button"
                            className={`tab-toggle-btn ${chartMetric === "interval" ? "is-active" : ""}`}
                            onClick={() => setChartMetric("interval")}
                            style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                          >
                            间隔 (ms)
                          </button>
                        </div>
                      </div>
                      {renderTrendChart()}
                    </div>

                    {/* SVG Histogram Distribution */}
                    <div className="chart-box">
                      <span className="chart-title">时间间隔偏差分布直方图</span>
                      {renderDistributionChart()}
                    </div>
                  </div>
                ) : (
                  /* TAB 2: Table data analysis and individual edits */
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Sequencer axis visualization */}
                    {renderSequencerGrid()}

                    {/* Scrollable grid log table */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                          数据详情 (共 {taps.length} 拍)
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                          提示: 可以删除偏差过大或失误敲击数据点
                        </span>
                      </div>
                      <div className="beat-log-table-wrapper">
                        <table className="beat-log-table">
                          <thead>
                            <tr>
                              <th>序号</th>
                              <th>绝对时间 (s)</th>
                              <th>间隔时间 (ms)</th>
                              <th>即时 BPM</th>
                              <th>偏差量 (ms)</th>
                              <th style={{ textAlign: "right" }}>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {taps.map((tap, idx) => {
                              const absTime = ((tap.timestamp - taps[0].timestamp) / 1000).toFixed(3);
                              let interval = 0;
                              let localBpm = "--";
                              let deviationStr = "--";
                              let deviationColor = "var(--text-primary)";

                              if (idx > 0) {
                                interval = tap.timestamp - taps[idx - 1].timestamp;
                                localBpm = Math.round(60000 / interval).toString();
                                const deviation = interval - analysis.avgInterval;
                                deviationStr = (deviation > 0 ? "+" : "") + Math.round(deviation) + " ms";
                                
                                // Color-code deviation severity
                                const devAbsPercent = Math.abs(deviation) / analysis.avgInterval;
                                if (devAbsPercent > 0.15) deviationColor = "var(--accent-danger)";
                                else if (devAbsPercent > 0.05) deviationColor = "var(--accent-warning)";
                                else deviationColor = "var(--accent-primary)";
                              }

                              return (
                                <tr key={tap.id}>
                                  <td>#{idx + 1}</td>
                                  <td>{absTime}s</td>
                                  <td>{idx === 0 ? "起跑/基准点" : `${Math.round(interval)} ms`}</td>
                                  <td>{localBpm}</td>
                                  <td style={{ color: deviationColor, fontWeight: idx > 0 ? "600" : "normal" }}>
                                    {deviationStr}
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <button
                                      type="button"
                                      className="delete-beat-btn"
                                      onClick={() => deleteTap(tap.id)}
                                      title="删除此拍并重新分析"
                                    >
                                      删除
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}
