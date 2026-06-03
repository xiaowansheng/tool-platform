"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const MORSE_MAP: Record<string, string> = {
  'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.',
  'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..',
  'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.',
  's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
  'y': '-.--', 'z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '\'': '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..__.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

const REVERSE_MORSE_MAP: Record<string, string> = {};
for (const [key, value] of Object.entries(MORSE_MAP)) {
  REVERSE_MORSE_MAP[value] = key;
}

interface TranslationResult {
  morse: string;
  textToMorseMap: Array<[number, number]>;
  morseToTextMap: Record<number, number>;
}

// Translate plain text to Morse code
function encodeTextToMorse(
  text: string,
  dotChar: string,
  dashChar: string,
  charSpace: string,
  wordSpace: string
): TranslationResult {
  const morseParts: string[] = [];
  const textToMorseMap: Array<[number, number]> = [];
  const morseToTextMap: Record<number, number> = {};
  
  let currentMorsePos = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase();
    let morseToken = "";
    
    if (char === " ") {
      morseToken = wordSpace;
    } else if (char === "\n") {
      morseToken = "\n";
    } else if (char.charCodeAt(0) > 127) {
      // Escape non-ASCII (e.g. Chinese) characters to (uXXXX)
      const hex = char.charCodeAt(0).toString(16).padStart(4, "0");
      const escapeStr = `(u${hex})`;
      const parts = Array.from(escapeStr).map(c => MORSE_MAP[c.toLowerCase()] ?? "").filter(Boolean);
      morseToken = parts.join(charSpace);
    } else {
      const rawCode = MORSE_MAP[char] ?? "";
      // Replace default dots and dashes with custom ones
      morseToken = rawCode
        .replaceAll(".", dotChar)
        .replaceAll("-", dashChar);
    }
    
    const needsSep = (
      i > 0 &&
      text[i - 1] !== "\n" &&
      char !== "\n" &&
      morseToken !== "" &&
      morseParts[morseParts.length - 1] !== wordSpace &&
      morseParts[morseParts.length - 1] !== "\n"
    );

    if (needsSep) {
      morseParts.push(charSpace);
      currentMorsePos += charSpace.length;
    }
    
    const start = currentMorsePos;
    morseParts.push(morseToken);
    const end = currentMorsePos + morseToken.length;
    
    textToMorseMap.push([start, end]);
    for (let j = start; j < end; j++) {
      morseToTextMap[j] = i;
    }
    
    currentMorsePos = end;
  }
  
  return {
    morse: morseParts.join(""),
    textToMorseMap,
    morseToTextMap
  };
}

// Decode Morse code to plain text
function decodeMorseToText(
  morse: string,
  dotChar: string,
  dashChar: string,
  charSpace: string,
  wordSpace: string
): string {
  if (!morse.trim()) return "";

  // Normalize custom dot/dash to standard . and -
  const normalized = morse
    .replaceAll(dotChar, ".")
    .replaceAll(dashChar, "-");

  // Escape regex specials
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  const charSepRegex = new RegExp(escapeRegExp(charSpace));
  const wordSepRegex = new RegExp(escapeRegExp(wordSpace));

  // Split by newlines, then by words, then by characters
  const lines = normalized.split("\n");
  const decodedLines = lines.map(line => {
    const words = line.split(wordSepRegex);
    const decodedWords = words.map(word => {
      const chars = word.trim().split(charSepRegex).filter(Boolean);
      return chars
        .map(c => REVERSE_MORSE_MAP[c] ?? "?")
        .join("");
    });
    return decodedWords.join(" ");
  });

  let textResult = decodedLines.join("\n");

  // Unescape (uXXXX) representations back to unicode characters
  textResult = textResult.replace(/\(u([0-9a-fA-F]{4})\)/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return "(u" + hex + ")";
    }
  });

  return textResult;
}

const PRESETS = [
  { name: "SOS 求救信号", text: "SOS" },
  { name: "Hello World", text: "Hello World!" },
  { name: "摩尔斯密码", text: "Morse Code (u6469)(u5c14)(u65af)(u5bc6)(u7801)" },
  { name: "我爱你", text: "I Love You (u6211)(u7231)(u4f60)" },
  { name: "Google DeepMind", text: "Google DeepMind" }
];

export default function MorseCodeTool({ manifest }: ToolAppProps) {
  const [text, setText] = useState("SOS");
  const [dotChar, setDotChar] = useState(".");
  const [dashChar, setDashChar] = useState("-");
  const [charSpace, setCharSpace] = useState(" ");
  const [wordSpace, setWordSpace] = useState("/");
  
  const [wpm, setWpm] = useState(20);
  const [frequency, setFrequency] = useState(600);

  // Derive Morse and maps
  const { morse, morseToTextMap } = encodeTextToMorse(text, dotChar, dashChar, charSpace, wordSpace);
  const [morseInput, setMorseInput] = useState(morse);

  // Visual highlights during playback
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [playingTextIndex, setPlayingTextIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Web Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutsRef = useRef<number[]>([]);

  const [copiedText, setCopiedText] = useState(false);
  const [copiedMorse, setCopiedMorse] = useState(false);

  // Sync morseInput when text or settings change (unless manually typing morse)
  useEffect(() => {
    setMorseInput(morse);
  }, [text, dotChar, dashChar, charSpace, wordSpace]);

  // Clean up audio and timeouts on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const handleTextChange = (value: string) => {
    setText(value);
    setCopiedText(false);
    setCopiedMorse(false);
  };

  const handleMorseChange = (value: string) => {
    setMorseInput(value);
    setCopiedText(false);
    setCopiedMorse(false);
    // Auto-decode to plain text
    const decoded = decodeMorseToText(value, dotChar, dashChar, charSpace, wordSpace);
    setText(decoded);
  };

  const copyToClipboard = async (content: string, isText: boolean) => {
    try {
      await navigator.clipboard.writeText(content);
      if (isText) {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      } else {
        setCopiedMorse(true);
        setTimeout(() => setCopiedMorse(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleSwap = () => {
    // Treat current morseInput as text, and text as morseInput
    const tempText = text;
    setText(morseInput);
    setMorseInput(tempText);
  };

  const handleClear = () => {
    setText("");
    setMorseInput("");
    stopPlayback();
  };

  // Web Audio Playback
  const stopPlayback = () => {
    // Stop all oscillators
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Already stopped
      }
    });
    oscillatorsRef.current = [];

    // Clear all scheduled timeouts
    timeoutsRef.current.forEach(tId => window.clearTimeout(tId));
    timeoutsRef.current = [];

    // Close AudioContext
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }

    setIsPlaying(false);
    setPlayingIndex(null);
    setPlayingTextIndex(null);
  };

  const startPlayback = () => {
    stopPlayback();

    if (!morseInput.trim()) return;

    // Create AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      alert("您的浏览器不支持 Web Audio API");
      return;
    }

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;
    setIsPlaying(true);

    const unit = 1.2 / wpm; // Unit duration in seconds
    let currentTime = ctx.currentTime + 0.1; // Add brief buffer

    const runPlayback = () => {
      for (let j = 0; j < morseInput.length; j++) {
        const char = morseInput[j];
        const textIdx = morseToTextMap[j] ?? null;

        if (char === dotChar) {
          // Play Dot beep
          playBeep(currentTime, unit, j, textIdx);
          currentTime += unit; // sound duration
          currentTime += unit; // intra-character gap
        } else if (char === dashChar) {
          // Play Dash beep
          playBeep(currentTime, unit * 3, j, textIdx);
          currentTime += unit * 3; // sound duration
          currentTime += unit; // intra-character gap
        } else if (char === "\n") {
          currentTime += unit * 6; // newline pause
        } else if (char === charSpace) {
          // Add extra pause for char separation
          currentTime += unit * 2;
        } else if (char === wordSpace) {
          // Add extra pause for word separation
          currentTime += unit * 4;
        }
      }

      // Schedule final stop callback
      const totalTimeMs = (currentTime - ctx.currentTime) * 1000;
      const doneTimeout = window.setTimeout(() => {
        stopPlayback();
      }, totalTimeMs);
      timeoutsRef.current.push(doneTimeout);
    };

    const playBeep = (start: number, duration: number, morseIdx: number, textIdx: number | null) => {
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);

      // Volume envelope to prevent popping sounds
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(0.3, start + 0.005);
      gainNode.gain.setValueAtTime(0.3, start + duration - 0.005);
      gainNode.gain.linearRampToValueAtTime(0, start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
      oscillatorsRef.current.push(osc);

      // Schedule visual highlighting
      const delayStartMs = (start - ctx.currentTime) * 1000;
      const delayEndMs = (start + duration - ctx.currentTime) * 1000;

      const highlightStartTimeout = window.setTimeout(() => {
        setPlayingIndex(morseIdx);
        setPlayingTextIndex(textIdx);
      }, delayStartMs);
      timeoutsRef.current.push(highlightStartTimeout);

      const highlightEndTimeout = window.setTimeout(() => {
        setPlayingIndex(null);
        setPlayingTextIndex(null);
      }, delayEndMs);
      timeoutsRef.current.push(highlightEndTimeout);
    };

    runPlayback();
  };

  // Real-time beep on clicking keyboard buttons
  const playInstantBeep = (durationUnits: number) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const duration = (1.2 / wpm) * durationUnits;

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.005);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.005);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);

      setTimeout(() => {
        ctx.close();
      }, (duration + 0.1) * 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const keyboardInput = (char: string, unitLength?: number) => {
    setMorseInput(prev => {
      const newVal = prev + char;
      const decoded = decodeMorseToText(newVal, dotChar, dashChar, charSpace, wordSpace);
      setText(decoded);
      return newVal;
    });
    if (unitLength) {
      playInstantBeep(unitLength);
    }
  };

  const handleKeyboardBackspace = () => {
    setMorseInput(prev => {
      const newVal = prev.slice(0, -1);
      const decoded = decodeMorseToText(newVal, dotChar, dashChar, charSpace, wordSpace);
      setText(decoded);
      return newVal;
    });
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本与编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Presets and Global Toolbar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="button--secondary"
              style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
              onClick={() => handleTextChange(preset.text)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="button--secondary" onClick={handleSwap}>
            输入互换
          </button>
          <button type="button" className="button--danger" onClick={handleClear}>
            清空内容
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.8rem", marginBottom: "1.2rem" }}>
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>嘀 (Dot) 符号</label>
          <input
            type="text"
            value={dotChar}
            onChange={(e) => setDotChar(e.target.value || ".")}
            maxLength={2}
            style={{ width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.25rem 0.5rem", color: "var(--text-primary)" }}
          />
        </div>
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>哒 (Dash) 符号</label>
          <input
            type="text"
            value={dashChar}
            onChange={(e) => setDashChar(e.target.value || "-")}
            maxLength={2}
            style={{ width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.25rem 0.5rem", color: "var(--text-primary)" }}
          />
        </div>
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>字符分隔符</label>
          <input
            type="text"
            value={charSpace}
            onChange={(e) => setCharSpace(e.target.value)}
            style={{ width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.25rem 0.5rem", color: "var(--text-primary)" }}
          />
        </div>
        <div className="detail-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>单词分隔符</label>
          <input
            type="text"
            value={wordSpace}
            onChange={(e) => setWordSpace(e.target.value)}
            style={{ width: "100%", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.25rem 0.5rem", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="workspace workspace--two-column">
        {/* Left Column: Plain Text */}
        <label className="tool-field" style={{ position: "relative" }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            明文 (支持中英文)
            <button
              type="button"
              onClick={() => copyToClipboard(text, true)}
              style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}
              disabled={!text}
            >
              {copiedText ? "已复制" : "复制"}
            </button>
          </span>
          <div style={{ position: "relative", width: "100%", height: "200px" }}>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="请输入您想要转换的文字。输入中文会自动转换成 unicode escape 表示并编码。"
              spellCheck={false}
              style={{ width: "100%", height: "100%", resize: "none" }}
            />
            {/* Visual Text Highlight overlay during playback */}
            {isPlaying && playingTextIndex !== null && (
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "12px",
                  fontSize: "0.8rem",
                  background: "var(--accent-primary-dim)",
                  color: "var(--accent-primary)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  pointerEvents: "none",
                  border: "1px solid var(--accent-primary)",
                  boxShadow: "0 0 10px rgba(0, 240, 255, 0.2)"
                }}
              >
                正在播放字符: <strong style={{ fontSize: "1.1rem" }}>{text[playingTextIndex] || "空格"}</strong>
              </div>
            )}
          </div>
        </label>

        {/* Right Column: Morse Code */}
        <label className="tool-field" style={{ position: "relative" }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            摩尔斯电码
            <button
              type="button"
              onClick={() => copyToClipboard(morseInput, false)}
              style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}
              disabled={!morseInput}
            >
              {copiedMorse ? "已复制" : "复制"}
            </button>
          </span>
          <div style={{ position: "relative", width: "100%", height: "200px" }}>
            <textarea
              value={morseInput}
              onChange={(e) => handleMorseChange(e.target.value)}
              placeholder="可以在此直接输入或用下方键盘敲击摩尔斯电码，系统会自动解码为明文。"
              spellCheck={false}
              style={{
                width: "100%",
                height: "100%",
                resize: "none",
                fontFamily: "monospace",
                letterSpacing: "0.08em"
              }}
            />
          </div>
        </label>
      </div>

      {/* Visual Scrolling Code Highlights */}
      {morseInput.trim().length > 0 && (
        <div
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "1rem",
            marginTop: "1rem",
            overflow: "hidden"
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
            电码轨道视图 (滚动查看)
          </div>
          <div
            style={{
              display: "flex",
              gap: "2px",
              fontFamily: "monospace",
              fontSize: "1.2rem",
              whiteSpace: "nowrap",
              overflowX: "auto",
              paddingBottom: "0.5rem",
              minHeight: "2.2rem",
              alignItems: "center"
            }}
          >
            {Array.from(morseInput).map((char, index) => {
              const isCharPlaying = playingIndex === index;
              return (
                <span
                  key={index}
                  style={{
                    padding: "0.1rem 0.2rem",
                    borderRadius: "3px",
                    background: isCharPlaying ? "var(--accent-primary)" : "transparent",
                    color: isCharPlaying ? "var(--bg-base)" : "var(--text-primary)",
                    fontWeight: isCharPlaying ? "bold" : "normal",
                    transition: "all 0.08s ease",
                    boxShadow: isCharPlaying ? "0 0 8px var(--accent-primary)" : "none",
                    display: "inline-block",
                    minWidth: "10px",
                    textAlign: "center"
                  }}
                >
                  {char === " " ? "␣" : char}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Audio Playback Controls & Speed/Freq Tuning */}
      <div
        className="workspace"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginTop: "1.2rem",
          padding: "1rem",
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "8px"
        }}
      >
        {/* Playback Buttons */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.8rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>音频播放器</div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            {!isPlaying ? (
              <button
                type="button"
                className="button--primary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                onClick={startPlayback}
                disabled={!morseInput.trim()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                播放电报音
              </button>
            ) : (
              <button
                type="button"
                className="button--danger"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                onClick={stopPlayback}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                </svg>
                停止播放
              </button>
            )}
          </div>
        </div>

        {/* WPM Tuning Slider */}
        <div className="tool-field" style={{ gap: "0.4rem" }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span>电报速度 (WPM)</span>
            <strong>{wpm} WPM</strong>
          </span>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
            Words Per Minute，值越大滴答声越短促。
          </span>
        </div>

        {/* Frequency Tuning Slider */}
        <div className="tool-field" style={{ gap: "0.4rem" }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span>音调频率 (Frequency)</span>
            <strong>{frequency} Hz</strong>
          </span>
          <input
            type="range"
            min={300}
            max={1200}
            step={10}
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
            音频正弦波震荡频率，调小声音低沉，调大高亢。
          </span>
        </div>
      </div>

      {/* Quick Morse Keyboard */}
      <div
        style={{
          marginTop: "1.2rem",
          padding: "1rem",
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.8rem", textAlign: "left" }}>
          快捷摩尔斯键盘 (点击输入并模拟发报)
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.6rem",
            flexWrap: "wrap"
          }}
        >
          <button
            type="button"
            className="button--secondary"
            style={{ fontSize: "1.5rem", padding: "0.6rem 2rem", minWidth: "80px" }}
            onClick={() => keyboardInput(dotChar, 1)}
          >
            {dotChar}
          </button>
          <button
            type="button"
            className="button--secondary"
            style={{ fontSize: "1.5rem", padding: "0.6rem 2rem", minWidth: "80px" }}
            onClick={() => keyboardInput(dashChar, 3)}
          >
            {dashChar}
          </button>
          <button
            type="button"
            className="button--secondary"
            style={{ fontSize: "0.9rem", padding: "0.6rem 1.2rem" }}
            onClick={() => keyboardInput(charSpace)}
          >
            字符间距
          </button>
          <button
            type="button"
            className="button--secondary"
            style={{ fontSize: "0.9rem", padding: "0.6rem 1.2rem" }}
            onClick={() => keyboardInput(wordSpace)}
          >
            单词分隔
          </button>
          <button
            type="button"
            className="button--secondary"
            style={{ fontSize: "0.9rem", padding: "0.6rem 1.2rem", color: "var(--text-secondary)" }}
            onClick={handleKeyboardBackspace}
            disabled={!morseInput}
          >
            退格
          </button>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        说明：本工具完全在浏览器本地运行。中文使用 <strong>Unicode 转义符 (uXXXX)</strong> 桥接，实现了双向无损转换。
      </p>
    </section>
  );
}
