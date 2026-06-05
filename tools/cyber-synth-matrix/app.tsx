"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// ----------------------------------------------------------------------
// Constants & Scale Definitions
// ----------------------------------------------------------------------
const STEPS = 16;
const ROWS = 8;

interface RowMeta {
  name: string;
  nameEn: string;
  color: string;
  glow: string;
  type: "drum" | "bass" | "melody";
  freq?: number;
}

const ROW_METADATA: RowMeta[] = [
  // Drums (Rows 0-2)
  { name: "🎛️ 闭镲 (Hat)", nameEn: "Hi-Hat", color: "#ff007f", glow: "rgba(255, 0, 127, 0.5)", type: "drum" },
  { name: "🥁 军鼓 (Snare)", nameEn: "Snare", color: "#ff5500", glow: "rgba(255, 85, 0, 0.5)", type: "drum" },
  { name: "🔊 底鼓 (Kick)", nameEn: "Kick", color: "#ff0000", glow: "rgba(255, 0, 0, 0.5)", type: "drum" },
  // Bass (Rows 3-4)
  { name: "🎸 低音 B (Bass A)", nameEn: "Bass A (G2)", color: "#a000ff", glow: "rgba(160, 0, 255, 0.5)", type: "bass", freq: 98.00 }, // G2
  { name: "🎸 低音 A (Bass B)", nameEn: "Bass B (C2)", color: "#7700ff", glow: "rgba(119, 0, 255, 0.5)", type: "bass", freq: 65.41 }, // C2
  // Melody (Rows 5-7)
  { name: "🎹 旋律 C (Melody A)", nameEn: "Melody A (E5)", color: "#00f0ff", glow: "rgba(0, 240, 255, 0.5)", type: "melody", freq: 659.25 }, // E5
  { name: "🎹 旋律 B (Melody B)", nameEn: "Melody B (C5)", color: "#00aaff", glow: "rgba(0, 170, 255, 0.5)", type: "melody", freq: 523.25 }, // C5
  { name: "🎹 旋律 A (Melody C)", nameEn: "Melody C (G4)", color: "#00ffaa", glow: "rgba(0, 255, 170, 0.5)", type: "melody", freq: 392.00 }  // G4
];

// Presets Patterns
const PRESETS: Record<string, { bpm: number; grid: boolean[][] }> = {
  synthwave: {
    bpm: 120,
    grid: [
      // Hi-hat: every off-beat
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true],
      // Snare: steps 4 and 12
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      // Kick: four-on-the-floor
      [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      // Bass High (G2)
      [false, true, false, true, false, true, false, false, false, true, false, true, false, true, false, false],
      // Bass Low (C2)
      [true, false, true, false, true, false, true, true, true, false, true, false, true, false, true, true],
      // Melody (E5)
      [false, false, false, false, false, false, false, false, true, false, true, false, true, false, false, false],
      // Melody (C5)
      [true, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false],
      // Melody (G4)
      [false, false, true, false, false, false, true, false, false, true, false, false, false, true, false, false]
    ]
  },
  chiptune: {
    bpm: 140,
    grid: [
      // Hi-hat
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      // Snare
      [false, false, false, false, true, false, false, true, false, false, false, false, true, false, false, false],
      // Kick
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      // Bass High
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      // Bass Low
      [true, true, false, true, true, true, false, true, true, true, false, true, true, true, false, true],
      // Melody E5
      [true, false, true, false, true, true, false, true, false, true, true, false, true, false, true, false],
      // Melody C5
      [false, true, false, true, false, false, true, false, true, false, false, true, false, true, false, true],
      // Melody G4
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
    ]
  },
  minimal: {
    bpm: 124,
    grid: [
      // Hi-hat
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      // Snare
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      // Kick
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      // Bass A
      [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false],
      // Bass B
      [true, false, false, false, true, false, false, true, true, false, false, false, true, false, false, true],
      // Melody A
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      // Melody B
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      // Melody C
      [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false]
    ]
  },
  empty: {
    bpm: 120,
    grid: Array(ROWS).fill(null).map(() => Array(STEPS).fill(false))
  }
};

export default function CyberSynthMatrix({ locale }: ToolAppProps) {
  const isZh = locale === "zh";

  // Grid and Player State
  const [grid, setGrid] = useState<boolean[][]>(PRESETS.synthwave.grid);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activePreset, setActivePreset] = useState("synthwave");
  const [mutedTracks, setMutedTracks] = useState<boolean[]>(Array(ROWS).fill(false));
  const [delayFeedback, setDelayFeedback] = useState(0.3); // Echo feedback (0 to 0.9)
  const [filterCutoff, setFilterCutoff] = useState(1500); // Filter cutoff (200 to 5000)

  // Refs for Web Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
  const biquadFilterRef = useRef<BiquadFilterNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Scheduling states (Advanced scheduler)
  const schedulerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextNoteTimeRef = useRef(0.0);
  const stepRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Sync ref values for the timer thread
  isPlayingRef.current = isPlaying;

  // Waveform Visualizer Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sound Synth engine utilities
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      // Analyser Node for Visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      // Master Output Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.6, ctx.currentTime);

      // Lowpass filter
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterCutoff, ctx.currentTime);
      filter.Q.setValueAtTime(1.0, ctx.currentTime);

      // Space Delay / Echo node
      const delay = ctx.createDelay(1.0);
      const delayGain = ctx.createGain();
      delay.delayTime.setValueAtTime(0.3, ctx.currentTime);
      delayGain.gain.setValueAtTime(delayFeedback, ctx.currentTime);

      // Connect nodes: Synth -> Filter -> Delay Loop -> Master -> Analyser -> Output
      filter.connect(masterGain);
      
      // Delay feedback loop
      masterGain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(delay); // feedback loop
      delayGain.connect(masterGain); // mix back

      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      biquadFilterRef.current = filter;
      delayNodeRef.current = delay;
      delayGainRef.current = delayGain;
      masterGainRef.current = masterGain;
    }

    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  // Keep filter and delay node parameters updated live
  useEffect(() => {
    if (biquadFilterRef.current && audioCtxRef.current) {
      biquadFilterRef.current.frequency.setTargetAtTime(filterCutoff, audioCtxRef.current.currentTime, 0.05);
    }
  }, [filterCutoff]);

  useEffect(() => {
    if (delayGainRef.current && audioCtxRef.current) {
      delayGainRef.current.gain.setTargetAtTime(delayFeedback, audioCtxRef.current.currentTime, 0.05);
    }
  }, [delayFeedback]);

  // Noise Buffer Generator for Hats and Snare
  const getNoiseBuffer = (): AudioBuffer => {
    const ctx = audioCtxRef.current!;
    const bufferSize = ctx.sampleRate * 1.5; // 1.5 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  // Synthesize Individual Row Sounds
  const playRowTone = (rowIdx: number, time: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const meta = ROW_METADATA[rowIdx];
    const destination = biquadFilterRef.current || ctx.destination;

    if (meta.type === "melody" && meta.freq) {
      // 1. Melody Synth (Square/Triangle with resonant filter)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(meta.freq, time);
      
      // Decay envelope
      gainNode.gain.setValueAtTime(0.18, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.start(time);
      osc.stop(time + 0.4);

    } else if (meta.type === "bass" && meta.freq) {
      // 2. Bass Synth (Thick Sawtooth)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(meta.freq, time);

      // Short punchy decay
      gainNode.gain.setValueAtTime(0.24, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.start(time);
      osc.stop(time + 0.25);

    } else if (meta.type === "drum") {
      if (meta.nameEn === "Kick") {
        // 3. Kick Drum (Deep pitch-sweep sine wave)
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

        gainNode.gain.setValueAtTime(0.65, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

        osc.connect(gainNode);
        gainNode.connect(destination);

        osc.start(time);
        osc.stop(time + 0.2);

      } else if (meta.nameEn === "Snare") {
        // 4. Snare Drum (White Noise + low triangle)
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer();

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.value = 1000;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(destination);

        // Low body oscillator
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        bodyOsc.type = "triangle";
        bodyOsc.frequency.setValueAtTime(180, time);
        bodyGain.gain.setValueAtTime(0.15, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(destination);

        noise.start(time);
        noise.stop(time + 0.2);
        bodyOsc.start(time);
        bodyOsc.stop(time + 0.12);

      } else if (meta.nameEn === "Hi-Hat") {
        // 5. Hi-Hat (Filtered White Noise)
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer();

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "highpass";
        noiseFilter.frequency.value = 7500;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.06, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(destination);

        noise.start(time);
        noise.stop(time + 0.06);
      }
    }
  };

  // Toggle Grid Cell On/Off
  const toggleCell = (row: number, col: number) => {
    initAudio();
    const newGrid = grid.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? !c : c))
    );
    setGrid(newGrid);

    // If cell becomes active, play a short sound preview
    if (!grid[row][col] && audioCtxRef.current) {
      playRowTone(row, audioCtxRef.current.currentTime);
    }
  };

  // Play / Stop trigger
  const handlePlayToggle = () => {
    initAudio();
    if (isPlaying) {
      stopSequencer();
    } else {
      startSequencer();
    }
  };

  const startSequencer = () => {
    if (!audioCtxRef.current) return;
    setIsPlaying(true);
    
    // Set note scheduler starting pointer
    nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    stepRef.current = currentStep;
    
    // Start interval loop (polls every 25ms to load sounds in advance)
    schedulerTimerRef.current = setInterval(schedulerLoop, 25);
  };

  const stopSequencer = () => {
    setIsPlaying(false);
    setCurrentStep(-1);
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current) {
        clearInterval(schedulerTimerRef.current);
      }
    };
  }, []);

  // Advanced Web Audio Scheduler Loop (highly accurate)
  const schedulerLoop = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Look ahead 100ms
    const lookAhead = 0.1;
    const scheduleInterval = 0.025; // 25ms polling rate

    while (nextNoteTimeRef.current < ctx.currentTime + lookAhead) {
      // 1. Schedule notes for current step
      const stepToPlay = (stepRef.current + 1) % STEPS;
      scheduleStepNotes(stepToPlay, nextNoteTimeRef.current);
      stepRef.current = stepToPlay;

      // 2. Advance time based on BPM
      const secondsPerBeat = 60.0 / bpm;
      const secondsPerStep = secondsPerBeat / 4; // 16th note steps
      
      nextNoteTimeRef.current += secondsPerStep;
      
      // Update UI step sync
      const timeToStepChange = nextNoteTimeRef.current - ctx.currentTime;
      setTimeout(() => {
        if (isPlayingRef.current) {
          setCurrentStep(stepToPlay);
        }
      }, Math.max(0, timeToStepChange * 1000 - 30));
    }
  };

  // Schedule all active notes on a step
  const scheduleStepNotes = (stepIndex: number, time: number) => {
    grid.forEach((row, rowIdx) => {
      // If cell is active and track is not muted, trigger synth sound
      if (row[stepIndex] && !mutedTracks[rowIdx]) {
        playRowTone(rowIdx, time);
      }
    });
  };

  // Load Presets
  const handlePresetSelect = (presetKey: string) => {
    stopSequencer();
    const preset = PRESETS[presetKey];
    if (preset) {
      setGrid(preset.grid);
      setBpm(preset.bpm);
      setActivePreset(presetKey);
    }
  };

  // Clear Grid
  const clearGrid = () => {
    stopSequencer();
    setGrid(Array(ROWS).fill(null).map(() => Array(STEPS).fill(false)));
    setActivePreset("");
  };

  // Track Mute Toggle
  const toggleMute = (trackIdx: number) => {
    const nextMuted = [...mutedTracks];
    nextMuted[trackIdx] = !nextMuted[trackIdx];
    setMutedTracks(nextMuted);
  };

  // ----------------------------------------------------------------------
  // Visualizer Animation Loop
  // ----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const bufferLength = 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      
      // Clear canvas with trace tail effect (opacity)
      ctx.fillStyle = "rgba(12, 13, 25, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isPlaying || !analyserRef.current) {
        // Draw standard subtle flat line
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      analyserRef.current.getByteTimeDomainData(dataArray);

      // Setup glowing neon style
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00f0ff";
      
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Export grid code to clipboard
  const handleExport = () => {
    try {
      const stateObj = { bpm, grid, mutedTracks, delayFeedback, filterCutoff };
      const code = btoa(JSON.stringify(stateObj));
      navigator.clipboard.writeText(code);
      alert(isZh ? "音乐代码已复制到剪贴板！" : "Music code copied to clipboard!");
    } catch (e) {
      alert(isZh ? "导出失败" : "Export failed");
    }
  };

  // Import grid code
  const handleImport = () => {
    const code = prompt(isZh ? "请输入要导入的音乐代码：" : "Enter music code to import:");
    if (!code) return;
    try {
      const decoded = JSON.parse(atob(code));
      if (decoded.grid && Array.isArray(decoded.grid)) {
        stopSequencer();
        setGrid(decoded.grid);
        if (decoded.bpm) setBpm(decoded.bpm);
        if (decoded.mutedTracks) setMutedTracks(decoded.mutedTracks);
        if (decoded.delayFeedback) setDelayFeedback(decoded.delayFeedback);
        if (decoded.filterCutoff) setFilterCutoff(decoded.filterCutoff);
        setActivePreset("");
        alert(isZh ? "导入成功！" : "Import successful!");
      }
    } catch (e) {
      alert(isZh ? "无效的代码格式" : "Invalid code format");
    }
  };

  return (
    <div className="sequencer-container">
      {/* Visual Design tokens and classes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sequencer-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          color: #e2e8f0;
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
        }

        .visualizer-card {
          width: 100%;
          background: #141526;
          border: 2px solid #1f2240;
          border-radius: 12px;
          overflow: hidden;
          padding: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }

        .visualizer-canvas {
          display: block;
          width: 100%;
          height: 75px;
          border-radius: 6px;
          background: #0c0d19;
        }

        .control-strip {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          gap: 1rem;
          background: #141526;
          border: 2px solid #1f2240;
          padding: 1rem 1.5rem;
          border-radius: 14px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .btn-play {
          background: linear-gradient(135deg, #00f0ff, #7f00ff);
          border: none;
          color: white;
          padding: 10px 24px;
          font-size: 1rem;
          font-weight: 800;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
        }

        .btn-play:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.55);
        }

        .bpm-slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .bpm-slider {
          -webkit-appearance: none;
          width: 140px;
          height: 6px;
          background: #1f2240;
          border-radius: 3px;
          outline: none;
        }

        .bpm-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00f0ff;
          cursor: pointer;
          box-shadow: 0 0 8px #00f0ff;
          transition: transform 0.1s;
        }

        .bpm-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .preset-select {
          background: #0c0d19;
          border: 1.5px solid #1f2240;
          color: #e2e8f0;
          padding: 6px 14px;
          border-radius: 6px;
          outline: none;
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .matrix-board {
          display: flex;
          flex-direction: column;
          width: 100%;
          background: #141526;
          border: 2px solid #1f2240;
          border-radius: 14px;
          padding: 1.2rem;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          gap: 10px;
          overflow-x: auto;
        }

        .matrix-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 780px;
        }

        .track-header {
          width: 130px;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-right: 8px;
          flex-shrink: 0;
        }

        .mute-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8;
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.15s;
        }

        .mute-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .mute-btn--active {
          background: #ff007f33;
          border-color: #ff007f77;
          color: #ff007f;
        }

        .cells-container {
          display: flex;
          gap: 6px;
          flex: 1;
        }

        .matrix-cell {
          flex: 1;
          aspect-ratio: 1;
          border-radius: 6px;
          background: rgba(12, 13, 25, 0.7);
          border: 1.5px solid #20223d;
          cursor: pointer;
          transition: all 0.12s ease;
          position: relative;
          min-width: 28px;
          min-height: 28px;
        }

        .matrix-cell:hover {
          border-color: rgba(255,255,255,0.15);
          background: rgba(12, 13, 25, 0.95);
        }

        .matrix-cell--active {
          background: var(--cell-color);
          border-color: var(--cell-color);
          box-shadow: 0 0 10px var(--cell-glow);
        }

        .matrix-cell--current-step {
          outline: 2px solid rgba(255, 255, 255, 0.65);
          outline-offset: 1px;
          z-index: 2;
        }

        .step-index-row {
          display: flex;
          margin-bottom: 2px;
          padding-left: 142px;
          min-width: 780px;
          gap: 6px;
        }

        .step-index-label {
          flex: 1;
          text-align: center;
          font-size: 0.68rem;
          color: #64748b;
          font-weight: bold;
          min-width: 28px;
        }

        .step-index-label--active {
          color: #00f0ff;
          text-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
        }

        .effects-panel {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          background: #141526;
          border: 2px solid #1f2240;
          padding: 1.2rem 1.5rem;
          border-radius: 14px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .effect-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .effect-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          font-weight: bold;
          color: #94a3b8;
        }

        .sharing-tools {
          display: flex;
          gap: 10px;
        }

        .btn-share {
          background: #1f2240;
          border: 1px solid rgba(255,255,255,0.06);
          color: #e2e8f0;
          padding: 8px 16px;
          font-size: 0.82rem;
          font-weight: bold;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-share:hover {
          background: #2b305c;
          border-color: rgba(255,255,255,0.15);
        }
      ` }} />

      {/* 1. Visual Waveform Display */}
      <div className="visualizer-card">
        <canvas ref={canvasRef} className="visualizer-canvas" width={800} height={75} />
      </div>

      {/* 2. Control Toolbar Strip */}
      <div className="control-strip">
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn-play" onClick={handlePlayToggle}>
            {isPlaying ? (
              <>
                <span>⏹️</span>
                <span>{isZh ? "停止" : "STOP"}</span>
              </>
            ) : (
              <>
                <span>▶️</span>
                <span>{isZh ? "播放" : "PLAY"}</span>
              </>
            )}
          </button>
          <button className="btn-share" onClick={clearGrid}>
            {isZh ? "清空矩阵" : "Clear Grid"}
          </button>
        </div>

        {/* BPM Tempo Slider */}
        <div className="bpm-slider-container">
          <span>{isZh ? "节奏" : "Tempo"}</span>
          <input
            type="range"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            className="bpm-slider"
          />
          <span style={{ fontFamily: "monospace", width: "40px", color: "#00f0ff" }}>{bpm} BPM</span>
        </div>

        {/* Preset Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#94a3b8" }}>{isZh ? "预设" : "Preset"}</span>
          <select
            value={activePreset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="preset-select"
          >
            <option value="synthwave">🔮 {isZh ? "赛博电音" : "Synthwave"}</option>
            <option value="chiptune">👾 {isZh ? "8比特童趣" : "Chiptune"}</option>
            <option value="minimal">🎚️ {isZh ? "极简律动" : "Minimal Tech"}</option>
            <option value="empty">🕳️ {isZh ? "空白模板" : "Blank Matrix"}</option>
          </select>
        </div>
      </div>

      {/* 3. The 16x8 Sequencer Matrix Board */}
      <div className="matrix-board">
        {/* Step Index numbers on top */}
        <div className="step-index-row">
          {Array(STEPS).fill(null).map((_, idx) => (
            <div
              key={idx}
              className={`step-index-label ${currentStep === idx ? "step-index-label--active" : ""}`}
            >
              {idx + 1}
            </div>
          ))}
        </div>

        {/* The cells grid */}
        {grid.map((row, rowIdx) => {
          const meta = ROW_METADATA[rowIdx];
          const isMuted = mutedTracks[rowIdx];

          return (
            <div key={rowIdx} className="matrix-row">
              {/* Row/Track Header info */}
              <div className="track-header" style={{ color: isMuted ? "#64748b" : meta.color }}>
                <span style={{ fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isZh ? meta.name : meta.nameEn}
                </span>
                <button
                  className={`mute-btn ${isMuted ? "mute-btn--active" : ""}`}
                  onClick={() => toggleMute(rowIdx)}
                >
                  {isMuted ? (isZh ? "静音" : "MUTED") : (isZh ? "听" : "MUTE")}
                </button>
              </div>

              {/* Steps Cells */}
              <div className="cells-container">
                {row.map((isActive, colIdx) => (
                  <div
                    key={colIdx}
                    onClick={() => toggleCell(rowIdx, colIdx)}
                    className={`matrix-cell 
                      ${isActive ? "matrix-cell--active" : ""} 
                      ${currentStep === colIdx ? "matrix-cell--current-step" : ""}
                    `}
                    style={{
                      ["--cell-color" as any]: isActive ? meta.color : undefined,
                      ["--cell-glow" as any]: isActive ? meta.glow : undefined
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Synthesizer FX and Sharing Controls */}
      <div className="effects-panel">
        {/* Lowpass Filter Cutoff */}
        <div className="effect-control">
          <div className="effect-header">
            <span>🎚️ {isZh ? "滤波器截止频率 (Cutoff)" : "Lowpass Cutoff"}</span>
            <span style={{ color: "#00f0ff", fontFamily: "monospace" }}>{filterCutoff}Hz</span>
          </div>
          <input
            type="range"
            min={200}
            max={5000}
            step={50}
            value={filterCutoff}
            onChange={(e) => setFilterCutoff(parseInt(e.target.value, 10))}
            className="bpm-slider"
            style={{ width: "100%" }}
          />
        </div>

        {/* Space Reverb / Delay Echo */}
        <div className="effect-control">
          <div className="effect-header">
            <span>🌌 {isZh ? "太空回声反馈 (Echo)" : "Space Delay Feedback"}</span>
            <span style={{ color: "#00f0ff", fontFamily: "monospace" }}>{Math.round(delayFeedback * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={delayFeedback}
            onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
            className="bpm-slider"
            style={{ width: "100%" }}
          />
        </div>

        {/* Export / Import sharing code */}
        <div className="effect-control" style={{ justifyContent: "flex-end" }}>
          <div className="effect-header" style={{ marginBottom: "2px" }}>
            <span>🔗 {isZh ? "音乐分享" : "Share Music"}</span>
          </div>
          <div className="sharing-tools">
            <button className="btn-share" onClick={handleExport} style={{ flex: 1 }}>
              {isZh ? "复制音乐代码" : "Copy Code"}
            </button>
            <button className="btn-share" onClick={handleImport} style={{ flex: 1 }}>
              {isZh ? "导入音乐代码" : "Import Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
