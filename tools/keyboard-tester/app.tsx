"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface KeyInfo {
  key: string;
  code: string;
  keyCode: number;
  location: number;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  repeat: boolean;
  combo: string;
}

interface KeyDef {
  code: string;
  label: string;
  w?: number;
  shift?: string;
}

const ROWS: KeyDef[][] = [
  [
    { code: "Backquote", label: "`", shift: "~" },
    { code: "Digit1", label: "1", shift: "!" },
    { code: "Digit2", label: "2", shift: "@" },
    { code: "Digit3", label: "3", shift: "#" },
    { code: "Digit4", label: "4", shift: "$" },
    { code: "Digit5", label: "5", shift: "%" },
    { code: "Digit6", label: "6", shift: "^" },
    { code: "Digit7", label: "7", shift: "&" },
    { code: "Digit8", label: "8", shift: "*" },
    { code: "Digit9", label: "9", shift: "(" },
    { code: "Digit0", label: "0", shift: ")" },
    { code: "Minus", label: "-", shift: "_" },
    { code: "Equal", label: "=", shift: "+" },
    { code: "Backspace", label: "Back", w: 2 },
  ],
  [
    { code: "Tab", label: "Tab", w: 1.5 },
    { code: "KeyQ", label: "Q" },
    { code: "KeyW", label: "W" },
    { code: "KeyE", label: "E" },
    { code: "KeyR", label: "R" },
    { code: "KeyT", label: "T" },
    { code: "KeyY", label: "Y" },
    { code: "KeyU", label: "U" },
    { code: "KeyI", label: "I" },
    { code: "KeyO", label: "O" },
    { code: "KeyP", label: "P" },
    { code: "BracketLeft", label: "[", shift: "{" },
    { code: "BracketRight", label: "]", shift: "}" },
    { code: "Backslash", label: "\\", shift: "|", w: 1.5 },
  ],
  [
    { code: "CapsLock", label: "Caps", w: 1.75 },
    { code: "KeyA", label: "A" },
    { code: "KeyS", label: "S" },
    { code: "KeyD", label: "D" },
    { code: "KeyF", label: "F" },
    { code: "KeyG", label: "G" },
    { code: "KeyH", label: "H" },
    { code: "KeyJ", label: "J" },
    { code: "KeyK", label: "K" },
    { code: "KeyL", label: "L" },
    { code: "Semicolon", label: ";", shift: ":" },
    { code: "Quote", label: "'", shift: '"' },
    { code: "Enter", label: "Enter", w: 2.25 },
  ],
  [
    { code: "ShiftLeft", label: "Shift", w: 2.25 },
    { code: "KeyZ", label: "Z" },
    { code: "KeyX", label: "X" },
    { code: "KeyC", label: "C" },
    { code: "KeyV", label: "V" },
    { code: "KeyB", label: "B" },
    { code: "KeyN", label: "N" },
    { code: "KeyM", label: "M" },
    { code: "Comma", label: ",", shift: "<" },
    { code: "Period", label: ".", shift: ">" },
    { code: "Slash", label: "/", shift: "?" },
    { code: "ShiftRight", label: "Shift", w: 2.75 },
  ],
  [
    { code: "ControlLeft", label: "Ctrl", w: 1.25 },
    { code: "MetaLeft", label: "Win", w: 1.25 },
    { code: "AltLeft", label: "Alt", w: 1.25 },
    { code: "Space", label: "", w: 6.25 },
    { code: "AltRight", label: "Alt", w: 1.25 },
    { code: "MetaRight", label: "Win", w: 1.25 },
    { code: "ContextMenu", label: "☰", w: 1.25 },
    { code: "ControlRight", label: "Ctrl", w: 1.25 },
  ],
];

const FN_ROW = [
  { code: "Escape", label: "Esc" },
  { code: "F1", label: "F1" },
  { code: "F2", label: "F2" },
  { code: "F3", label: "F3" },
  { code: "F4", label: "F4" },
  { code: "F5", label: "F5" },
  { code: "F6", label: "F6" },
  { code: "F7", label: "F7" },
  { code: "F8", label: "F8" },
  { code: "F9", label: "F9" },
  { code: "F10", label: "F10" },
  { code: "F11", label: "F11" },
  { code: "F12", label: "F12" },
  { code: "PrintScreen", label: "PrtSc" },
  { code: "ScrollLock", label: "ScrLk" },
  { code: "Pause", label: "Pause" },
];

const NAV_KEYS = [
  { code: "Insert", label: "Ins" },
  { code: "Home", label: "Home" },
  { code: "PageUp", label: "PgUp" },
  { code: "Delete", label: "Del" },
  { code: "End", label: "End" },
  { code: "PageDown", label: "PgDn" },
];

const ARROW_KEYS = [
  { code: "ArrowUp", label: "↑" },
  { code: "ArrowLeft", label: "←" },
  { code: "ArrowDown", label: "↓" },
  { code: "ArrowRight", label: "→" },
];

const NUMPAD_ROWS: KeyDef[][] = [
  [
    { code: "NumLock", label: "NumLk" },
    { code: "NumpadDivide", label: "/" },
    { code: "NumpadMultiply", label: "*" },
    { code: "NumpadSubtract", label: "-" },
  ],
  [
    { code: "Numpad7", label: "7" },
    { code: "Numpad8", label: "8" },
    { code: "Numpad9", label: "9" },
    { code: "NumpadAdd", label: "+" },
  ],
  [
    { code: "Numpad4", label: "4" },
    { code: "Numpad5", label: "5" },
    { code: "Numpad6", label: "6" },
  ],
  [
    { code: "Numpad1", label: "1" },
    { code: "Numpad2", label: "2" },
    { code: "Numpad3", label: "3" },
  ],
  [
    { code: "Numpad0", label: "0", w: 2 },
    { code: "NumpadDecimal", label: "." },
  ],
];

const BASE_W = 44;
const KEY_H = 46;
const GAP = 4;

function locationName(loc: number): string {
  if (loc === 1) return "Standard";
  if (loc === 2) return "Left";
  if (loc === 3) return "Right";
  if (loc === 4) return "Numpad";
  return "General";
}

function buildCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  const isModifier = e.key === "Control" || e.key === "Alt" || e.key === "Shift" || e.key === "Meta";
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");
  if (!isModifier) parts.push(e.key);
  return parts.join(" + ") || (e.key === "Control" ? "Ctrl" : e.key);
}

function keyStyle(active: boolean, w: number, isRight: boolean): React.CSSProperties {
  return {
    minWidth: w,
    height: KEY_H,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    fontFamily: "system-ui, sans-serif",
    color: active ? "#fff" : "#cbd5e1",
    background: active
      ? isRight
        ? "linear-gradient(135deg, #6366f1, #4f46e5)"
        : "linear-gradient(135deg, #22c55e, #16a34a)"
      : "linear-gradient(180deg, #3b4a5e 0%, #2d3a4d 100%)",
    border: active
      ? isRight ? "2px solid #818cf8" : "2px solid #4ade80"
      : "1px solid #475569",
    boxShadow: active
      ? isRight
        ? "0 0 16px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
        : "0 0 16px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
      : "0 2px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
    transform: active ? "translateY(-1px) scale(1.04)" : "translateY(0) scale(1)",
    transition: "all 0.08s ease",
    userSelect: "none",
    cursor: "default",
    textShadow: active ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
  };
}

function keyWidth(k: KeyDef): number {
  return (k.w ?? 1) * BASE_W + (k.w ?? 1) * GAP;
}

export default function KeyboardTesterTool({ manifest }: ToolAppProps) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [lastKey, setLastKey] = useState<KeyInfo | null>(null);
  const [history, setHistory] = useState<KeyInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const combo = buildCombo(e);
    const info: KeyInfo = {
      key: e.key, code: e.code, keyCode: e.keyCode, location: e.location,
      shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
      repeat: e.repeat, combo,
    };
    setPressed(prev => new Set(prev).add(e.code));
    setLastKey(info);
    if (!e.repeat) {
      setHistory(prev => [info, ...prev].slice(0, 50));
      setTotalCount(prev => prev + 1);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setPressed(prev => { const n = new Set(prev); n.delete(e.code); return n; });
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      e.preventDefault();
      handleKeyDown(e);
    };
    const up = (e: KeyboardEvent) => {
      e.preventDefault();
      handleKeyUp(e);
    };
    const blur = () => setPressed(new Set());
    document.addEventListener("keydown", down, true);
    document.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("keydown", down, true);
      document.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", blur);
    };
  }, [handleKeyDown, handleKeyUp]);

  const pressedCount = pressed.size;

  function renderKey(k: KeyDef, isRight = false) {
    const active = pressed.has(k.code);
    return (
      <div key={k.code} style={{ position: "relative", ...keyStyle(active, keyWidth(k), isRight) }}>
        {k.shift ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.15 }}>
            <span style={{ fontSize: 9, opacity: 0.7 }}>{k.shift}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{k.label}</span>
          </div>
        ) : (
          k.label
        )}
      </div>
    );
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">硬件测试</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div ref={containerRef} style={{
        outline: "none",
        marginBottom: 16,
        padding: 16,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 12,
        border: `2px solid ${pressedCount > 0 ? "#22c55e" : "#334155"}`,
        transition: "border-color 0.2s",
        boxShadow: pressedCount > 0 ? "0 0 30px rgba(34,197,94,0.1)" : "0 4px 12px rgba(0,0,0,0.2)",
        overflowX: "auto",
      }}>
        <div style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: GAP,
        }}>
          <div style={{ display: "flex", gap: GAP }}>
            {FN_ROW.map(k => renderKey(k))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {ROWS.map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: GAP }}>
                  {row.map(k => renderKey(k))}
                </div>
              ))}
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: GAP,
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                <div style={{ display: "flex", gap: GAP }}>
                  {NAV_KEYS.slice(0, 3).map(k => renderKey(k))}
                </div>
                <div style={{ display: "flex", gap: GAP }}>
                  {NAV_KEYS.slice(3).map(k => renderKey(k))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: GAP, alignItems: "center" }}>
                <div style={{ display: "flex", gap: GAP }}>
                  {ARROW_KEYS.slice(0, 1).map(k => renderKey(k))}
                </div>
                <div style={{ display: "flex", gap: GAP }}>
                  {ARROW_KEYS.slice(1).map(k => renderKey(k))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {NUMPAD_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: GAP }}>
                  {row.map(k => renderKey(k, true))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 12, fontSize: "0.7rem", color: "#64748b" }}>
          点击此处后按键测试 · 已按 {totalCount} 键 · 当前按下 {pressedCount} 键
        </p>
      </div>

      {lastKey && (
        <div className="detail-grid" style={{ marginBottom: 12 }}>
          <article className="detail-card"><h4>组合键</h4><p className="mono-output" style={{ color: lastKey.combo.includes("+") ? "var(--color-primary, #6366f1)" : undefined, fontWeight: lastKey.combo.includes("+") ? 600 : undefined }}>{lastKey.combo}</p></article>
          <article className="detail-card"><h4>Key</h4><p className="mono-output">{lastKey.key}</p></article>
          <article className="detail-card"><h4>Code</h4><p className="mono-output">{lastKey.code}</p></article>
          <article className="detail-card"><h4>KeyCode</h4><p>{lastKey.keyCode}</p></article>
          <article className="detail-card"><h4>位置</h4><p>{locationName(lastKey.location)}</p></article>
          <article className="detail-card"><h4>重复</h4><p>{lastKey.repeat ? "是" : "否"}</p></article>
          <article className="detail-card"><h4>Ctrl</h4><p style={{ color: lastKey.ctrl ? "#22c55e" : "#64748b", fontWeight: lastKey.ctrl ? 700 : 400 }}>{lastKey.ctrl ? "按下" : "释放"}</p></article>
          <article className="detail-card"><h4>Shift</h4><p style={{ color: lastKey.shift ? "#22c55e" : "#64748b", fontWeight: lastKey.shift ? 700 : 400 }}>{lastKey.shift ? "按下" : "释放"}</p></article>
          <article className="detail-card"><h4>Alt</h4><p style={{ color: lastKey.alt ? "#22c55e" : "#64748b", fontWeight: lastKey.alt ? 700 : 400 }}>{lastKey.alt ? "按下" : "释放"}</p></article>
          <article className="detail-card"><h4>Meta</h4><p style={{ color: lastKey.meta ? "#22c55e" : "#64748b", fontWeight: lastKey.meta ? 700 : 400 }}>{lastKey.meta ? "按下" : "释放"}</p></article>
        </div>
      )}

      {history.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted)" }}>按键历史 ({history.length})</summary>
          <div style={{ marginTop: 6, maxHeight: 200, overflowY: "auto" }}>
            <div className="tool-table">
              <div className="tool-table__row tool-table__row--head"><span>组合键</span><span>Key</span><span>Code</span><span>修饰键</span></div>
              {history.map((k, i) => (
                <div key={i} className="tool-table__row">
                  <span className="mono-output" style={{ fontWeight: k.combo.includes("+") ? 600 : 400 }}>{k.combo}</span>
                  <span className="mono-output">{k.key}</span>
                  <span className="mono-output">{k.code}</span>
                  <span>{[k.shift && "⇧", k.ctrl && "⌃", k.alt && "⌥", k.meta && "⌘"].filter(Boolean).join(" ") || "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
    </section>
  );
}
