"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const TEMPO_RANGES = [
  { name: "庄板 (Largo)", range: "40-60", bpm: 50 },
  { name: "行板 (Andante)", range: "76-108", bpm: 88 },
  { name: "中板 (Moderato)", range: "108-120", bpm: 114 },
  { name: "快板 (Allegro)", range: "120-168", bpm: 144 },
  { name: "急板 (Presto)", range: "168-200", bpm: 184 }
];

export default function MetronomeTool({ manifest }: ToolAppProps) {
  const [bpm, setBpm] = useState<number>(120);
  const [beats, setBeats] = useState<number>(4);
  const [subdivision, setSubdivision] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.8);
  const [soundType, setSoundType] = useState<string>("woodblock");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeBeat, setActiveBeat] = useState<number>(-1);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  // Refs for the Web Audio Scheduler
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const nextNoteTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  const currentMainBeatRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);
  const notesQueue = useRef<{ time: number; beatNumber: number }[]>([]);
  const pendulumRef = useRef<HTMLDivElement>(null);

  // Synchronize state values to refs so scheduler interval can access them without closure issues
  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);
  const subdivisionRef = useRef(subdivision);
  const soundTypeRef = useRef(soundType);
  const volumeRef = useRef(volume);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { beatsRef.current = beats; }, [beats]);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);
  useEffect(() => { soundTypeRef.current = soundType; }, [soundType]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const scheduleNote = (beatNumber: number, time: number, sound: string, vol: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const subdiv = subdivisionRef.current;
    const isFirstBeat = (beatNumber % subdiv) === 0 && Math.floor(beatNumber / subdiv) === 0;
    const isMainBeat = (beatNumber % subdiv) === 0;

    if (sound === "beep") {
      osc.type = "sine";
      let freq = 550;
      if (isFirstBeat) freq = 900;
      else if (isMainBeat) freq = 700;
      else freq = 450;

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(vol * 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.start(time);
      osc.stop(time + 0.09);
    } 
    else if (sound === "woodblock") {
      osc.type = "sine";
      let baseFreq = 800;
      if (isFirstBeat) baseFreq = 1400;
      else if (isMainBeat) baseFreq = 1100;
      else baseFreq = 750;

      osc.frequency.setValueAtTime(baseFreq, time);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, time + 0.015);

      gain.gain.setValueAtTime(vol * 1.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.start(time);
      osc.stop(time + 0.05);
    } 
    else if (sound === "drum") {
      osc.type = "triangle";
      let baseFreq = 180;
      if (isFirstBeat) baseFreq = 300;
      else if (isMainBeat) baseFreq = 220;
      else baseFreq = 140;

      osc.frequency.setValueAtTime(baseFreq, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.035);

      gain.gain.setValueAtTime(vol * 1.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc.start(time);
      osc.stop(time + 0.07);
    } 
    else if (sound === "cowbell") {
      osc.type = "square";
      let baseFreq = 587;
      if (isFirstBeat) baseFreq = 880;
      else if (isMainBeat) baseFreq = 784;
      else baseFreq = 440;

      osc.frequency.setValueAtTime(baseFreq, time);

      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(baseFreq * 1.48, time);

      const cowbellGain = ctx.createGain();
      osc2.connect(cowbellGain);
      cowbellGain.connect(gain);

      gain.gain.setValueAtTime(vol * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + 0.14);
      osc2.stop(time + 0.14);
    }
  };

  const scheduler = () => {
    if (!audioCtxRef.current) return;

    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      const beatNumber = currentBeatRef.current;
      const time = nextNoteTimeRef.current;

      scheduleNote(beatNumber, time, soundTypeRef.current, volumeRef.current);
      notesQueue.current.push({ time, beatNumber });

      const secondsPerBeat = 60.0 / bpmRef.current;
      const secondsPerNote = secondsPerBeat / subdivisionRef.current;
      nextNoteTimeRef.current += secondsPerNote;

      currentBeatRef.current++;
      if (currentBeatRef.current >= beatsRef.current * subdivisionRef.current) {
        currentBeatRef.current = 0;
      }
    }
  };

  const drawLoop = () => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    while (notesQueue.current.length && notesQueue.current[0].time <= now) {
      const note = notesQueue.current.shift();
      if (note) {
        setActiveBeat(note.beatNumber);

        if (note.beatNumber % subdivisionRef.current === 0) {
          lastBeatTimeRef.current = note.time;
          currentMainBeatRef.current = Math.floor(note.beatNumber / subdivisionRef.current);
        }
      }
    }

    if (pendulumRef.current) {
      const beatDuration = 60.0 / bpmRef.current;
      const timeSinceLastBeat = now - lastBeatTimeRef.current;
      const phase = Math.min(1, Math.max(0, timeSinceLastBeat / beatDuration));
      
      const ease = (1 - Math.cos(phase * Math.PI)) / 2;
      const isEven = currentMainBeatRef.current % 2 === 0;
      const angle = isEven ? (-26 + ease * 52) : (26 - ease * 52);

      pendulumRef.current.style.transform = `rotate(${angle}deg)`;
    }

    animationFrameRef.current = requestAnimationFrame(drawLoop);
  };

  const startMetronome = () => {
    if (isPlaying) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    notesQueue.current = [];
    nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    currentBeatRef.current = 0;
    currentMainBeatRef.current = 0;
    lastBeatTimeRef.current = audioCtxRef.current.currentTime;

    setIsPlaying(true);

    timerIdRef.current = window.setInterval(scheduler, 25);
    animationFrameRef.current = requestAnimationFrame(drawLoop);
  };

  const stopMetronome = () => {
    if (!isPlaying) return;

    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsPlaying(false);
    setActiveBeat(-1);

    if (pendulumRef.current) {
      pendulumRef.current.style.transform = "rotate(0deg)";
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(250, newBpm));
    setBpm(clamped);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    setTapTimes((prev) => {
      const filtered = prev.filter((t) => now - t < 2200);
      const nextTaps = [...filtered, now];

      if (nextTaps.length >= 2) {
        let sum = 0;
        for (let i = 1; i < nextTaps.length; i++) {
          sum += nextTaps[i] - nextTaps[i - 1];
        }
        const avg = sum / (nextTaps.length - 1);
        const calculatedBpm = Math.round(60000 / avg);
        handleBpmChange(calculatedBpm);
      }
      return nextTaps;
    });
  };

  // Adjust beats count ensuring activeBeat doesn't crash
  const handleBeatsChange = (val: number) => {
    setBeats(val);
    if (currentBeatRef.current >= val * subdivision) {
      currentBeatRef.current = 0;
    }
  };

  const handleSubdivisionChange = (val: number) => {
    setSubdivision(val);
    if (currentBeatRef.current >= beats * val) {
      currentBeatRef.current = 0;
    }
  };

  // Calculate slide weight position: closer to pivot (lower down) = faster tempo
  const weightTopPosition = useMemo(() => {
    // 30 bpm -> top: 25px
    // 250 bpm -> top: 145px
    const percentage = (bpm - 30) / 220;
    return 25 + percentage * 120;
  }, [bpm]);

  // Generate beat lights list
  const lightDots = useMemo(() => {
    const dots = [];
    const totalSubNotes = beats * subdivision;
    for (let i = 0; i < totalSubNotes; i++) {
      const isMain = i % subdivision === 0;
      const isDown = i === 0;
      const isCurrent = activeBeat === i && isPlaying;
      
      dots.push({
        id: i,
        isMain,
        isDown,
        isCurrent
      });
    }
    return dots;
  }, [beats, subdivision, activeBeat, isPlaying]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">视频音频</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="metronome-layout">
        {/* Left Column: Visual Metronome */}
        <div className="metronome-body-card">
          <div className="metronome-case">
            <div className="metronome-scale" />
            <div className="metronome-pendulum-track">
              <div 
                ref={pendulumRef} 
                className="metronome-pendulum-rod"
                style={{ 
                  transform: "rotate(0deg)",
                  transition: isPlaying ? "none" : "transform var(--duration-normal) var(--ease-out)"
                }}
              >
                <div 
                  className="metronome-pendulum-weight" 
                  style={{ top: `${weightTopPosition}px` }} 
                />
              </div>
            </div>
            <div className="metronome-pivot" />
          </div>

          <div className="metronome-bpm-display">
            <span className="metronome-bpm-value">{bpm}</span>
            <span className="metronome-bpm-label">BPM</span>
          </div>

          {/* Visual Beat Indicator Lights */}
          <div className="metronome-lights-container">
            {lightDots.map((dot) => {
              let dotClass = "metronome-light-dot";
              if (dot.isCurrent) {
                if (dot.isDown) dotClass += " active-downbeat";
                else if (dot.isMain) dotClass += " active-main";
                else dotClass += " active-sub";
              }
              
              // Style sub note dots slightly smaller
              const dotStyle = dot.isMain 
                ? {} 
                : { width: "0.65rem", height: "0.65rem", marginTop: "0.25rem" };

              return (
                <div 
                  key={dot.id} 
                  className={dotClass} 
                  style={dotStyle}
                  title={dot.isDown ? "强拍 (Downbeat)" : dot.isMain ? "次强/弱拍 (Upbeat)" : "细分拍 (Subdivision)"}
                />
              );
            })}
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="workspace workspace--stack" style={{ gap: "1.25rem" }}>
          {/* Playback Controls */}
          <div className="detail-grid" style={{ gridTemplateColumns: "1fr" }}>
            <button
              type="button"
              className="button--primary"
              onClick={togglePlayback}
              style={{
                padding: "1rem",
                fontSize: "1.2rem",
                borderRadius: "var(--radius-xl)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: isPlaying ? "0 0 15px var(--accent-primary-dim)" : "none",
                animation: isPlaying ? "pulse 2s infinite" : "none"
              }}
            >
              {isPlaying ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                  停止节拍 (Stop)
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  开始节拍 (Start)
                </>
              )}
            </button>
          </div>

          {/* BPM Adjustment */}
          <div className="detail-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
              <span>速度控制 (Tempo)</span>
              <button 
                type="button" 
                onClick={handleTapTempo}
                style={{ 
                  margin: 0, 
                  padding: "4px 12px", 
                  fontSize: "0.8rem", 
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent-secondary-dim)",
                  color: "var(--accent-secondary)",
                  borderColor: "transparent"
                }}
              >
                Tap 手动测速
              </button>
            </h3>

            <div className="tool-toolbar" style={{ gap: "0.5rem", marginBottom: "1rem" }}>
              <button type="button" onClick={() => handleBpmChange(bpm - 10)}>-10</button>
              <button type="button" onClick={() => handleBpmChange(bpm - 1)}>-1</button>
              <input
                type="range"
                min="30"
                max="250"
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                style={{ flex: 1, margin: "0 0.5rem" }}
              />
              <button type="button" onClick={() => handleBpmChange(bpm + 1)}>+1</button>
              <button type="button" onClick={() => handleBpmChange(bpm + 10)}>+10</button>
            </div>

            {/* Quick Speed Selection */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {TEMPO_RANGES.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleBpmChange(item.bpm)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 8px",
                    margin: 0,
                    borderRadius: "var(--radius-sm)",
                    background: bpm >= parseInt(item.range.split("-")[0]) && bpm <= parseInt(item.range.split("-")[1])
                      ? "var(--accent-primary-dim)"
                      : "transparent",
                    borderColor: bpm >= parseInt(item.range.split("-")[0]) && bpm <= parseInt(item.range.split("-")[1])
                      ? "var(--accent-primary)"
                      : "var(--border-default)",
                    color: bpm >= parseInt(item.range.split("-")[0]) && bpm <= parseInt(item.range.split("-")[1])
                      ? "var(--accent-primary)"
                      : "var(--text-secondary)"
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Time Signature and Subdivisions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label className="tool-field">
              <span>每小节拍数 (Beats)</span>
              <select value={beats} onChange={(e) => handleBeatsChange(Number(e.target.value))}>
                <option value="1">1 拍</option>
                <option value="2">2 拍 (2/4)</option>
                <option value="3">3 拍 (3/4, 3/8)</option>
                <option value="4">4 拍 (4/4)</option>
                <option value="5">5 拍 (5/4)</option>
                <option value="6">6 拍 (6/8)</option>
                <option value="7">7 拍 (7/8)</option>
                <option value="8">8 拍 (8/8)</option>
                <option value="9">9 拍 (9/8)</option>
                <option value="12">12 拍 (12/8)</option>
              </select>
            </label>

            <label className="tool-field">
              <span>节奏细分 (Subdivision)</span>
              <select value={subdivision} onChange={(e) => handleSubdivisionChange(Number(e.target.value))}>
                <option value="1">单拍 (1x)</option>
                <option value="2">双连音 (2x)</option>
                <option value="3">三连音 (3x)</option>
                <option value="4">四连音 (4x)</option>
              </select>
            </label>
          </div>

          {/* Sound settings */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
            <label className="tool-field">
              <span>主音量 (Volume)</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "100%" }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", width: "30px" }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </label>

            <label className="tool-field">
              <span>音色选择 (Sound)</span>
              <select value={soundType} onChange={(e) => setSoundType(e.target.value)}>
                <option value="woodblock">木鱼 (Wood)</option>
                <option value="beep">电子音 (Beep)</option>
                <option value="drum">鼓点 (Drum)</option>
                <option value="cowbell">牛铃 (Metal)</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1.5rem" }}>
        本工具使用 Web Audio API 内置的高精度时钟进行硬件级节拍调度，保证在任何浏览器负载下均稳定不丢拍、不漂移。
      </p>
    </section>
  );
}
