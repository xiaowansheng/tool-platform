"use client";

import { useEffect, useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const modeLabels = {
  focus: "专注",
  shortBreak: "短休息",
  longBreak: "长休息"
} as const;

type TimerMode = keyof typeof modeLabels;

interface DurationMap {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildPlan(durations: DurationMap, completed: number, mode: TimerMode, seconds: number) {
  return [
    `Current: ${modeLabels[mode]} ${formatSeconds(seconds)}`,
    `Completed focus blocks: ${completed}`,
    `Focus: ${durations.focus}m`,
    `Short break: ${durations.shortBreak}m`,
    `Long break: ${durations.longBreak}m`
  ].join("\n");
}

export default function PomodoroFocusTimerTool({ manifest }: ToolClientProps) {
  const [durations, setDurations] = useState<DurationMap>({ focus: 25, shortBreak: 5, longBreak: 15 });
  const [mode, setMode] = useState<TimerMode>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [notify, setNotify] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const progress = useMemo(() => {
    const total = Math.max(1, durations[mode] * 60);
    return Math.round(((total - seconds) / total) * 100);
  }, [durations, mode, seconds]);
  const plan = buildPlan(durations, completed, mode, seconds);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0 || !running) {
      return;
    }

    setRunning(false);
    setLog((items) => [`${modeLabels[mode]} finished at ${new Date().toLocaleTimeString()}`, ...items].slice(0, 8));

    if (mode === "focus") {
      setCompleted((value) => value + 1);
    }

    if (notify && typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(`${modeLabels[mode]} completed`, {
        body: mode === "focus" ? "Time for a break." : "Ready for the next focus block."
      });
    }
  }, [mode, notify, running, seconds]);

  function selectMode(nextMode: TimerMode) {
    setMode(nextMode);
    setSeconds(durations[nextMode] * 60);
    setRunning(false);
    setCopied(false);
  }

  function updateDuration(targetMode: TimerMode, minutes: number) {
    const nextMinutes = Math.max(1, Math.min(180, minutes || 1));

    setDurations((current) => ({ ...current, [targetMode]: nextMinutes }));

    if (targetMode === mode && !running) {
      setSeconds(nextMinutes * 60);
    }

    setCopied(false);
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      setError("当前浏览器不支持 Notification API。");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotify(permission === "granted");
    setError(permission === "granted" ? "" : "通知权限未开启，计时器仍可继续使用。");
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">实时</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((item) => (
          <button type="button" key={item} onClick={() => selectMode(item)}>
            {mode === item ? "✓ " : ""}{modeLabels[item]}
          </button>
        ))}
        <button type="button" onClick={() => setRunning((value) => !value)}>{running ? "暂停" : "开始"}</button>
        <button type="button" onClick={() => selectMode(mode)}>重置</button>
        <button type="button" onClick={() => void requestNotifications()}>{notify ? "通知已开" : "开启通知"}</button>
        <button type="button" onClick={() => void copyPlan()}>{copied ? "已复制" : "复制计划"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>计时器</h3><p>{formatSeconds(seconds)}</p></article>
        <article className="detail-card"><h3>模式</h3><p>{modeLabels[mode]}</p></article>
        <article className="detail-card"><h3>进度</h3><p>{progress}%</p></article>
        <article className="detail-card"><h3>完成数</h3><p>{completed}</p></article>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((item) => (
          <label className="tool-field tool-field--compact" key={item}>
            <span>{modeLabels[item]}分钟</span>
            <input type="number" min="1" max="180" value={durations[item]} onChange={(event) => updateDuration(item, Number(event.target.value))} />
          </label>
        ))}
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>当前计划</span>
          <textarea value={plan} readOnly spellCheck={false} />
        </label>
        <div className="workspace workspace--stack">
          {log.length === 0 ? <article className="detail-card"><h3>阶段记录</h3><p>完成一个阶段后会显示记录。</p></article> : null}
          {log.map((item) => (
            <article className="detail-card" key={item}><h3>记录</h3><p>{item}</p></article>
          ))}
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">计时器在浏览器标签页内运行；长时间后台挂起时，浏览器可能降低计时精度。</p>
    </section>
  );
}
