"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type OutputMode = "timeline" | "status" | "postmortem";

interface IncidentEvent {
  time: Date;
  actor: string;
  severity: string;
  message: string;
}

const sampleEvents = `2026-05-28T09:02:00Z | monitor | sev2 | API 5xx rate exceeded 8%
2026-05-28T09:06:00Z | oncall | sev2 | Confirmed checkout failures in us-east
2026-05-28T09:14:00Z | platform | sev2 | Rolled back gateway release 2026.05.28.1
2026-05-28T09:21:00Z | monitor | sev2 | Error rate returned below alert threshold
2026-05-28T09:35:00Z | incident-commander | sev2 | Incident resolved, postmortem required`;

function parseEventLine(line: string): IncidentEvent | null {
  const parts = line.split("|").map((part) => part.trim());

  if (parts.length >= 4) {
    const time = new Date(parts[0] ?? "");
    if (!Number.isNaN(time.getTime())) {
      return {
        time,
        actor: parts[1] ?? "unknown",
        severity: parts[2] ?? "info",
        message: parts.slice(3).join(" | ")
      };
    }
  }

  const match = line.match(/^(\S+)\s+(.+)$/);
  if (!match) return null;

  const time = new Date(match[1] ?? "");
  if (Number.isNaN(time.getTime())) return null;

  return {
    time,
    actor: "event",
    severity: "info",
    message: match[2] ?? ""
  };
}

function parseEvents(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseEventLine)
    .filter((event): event is IncidentEvent => event !== null)
    .sort((left, right) => left.time.getTime() - right.time.getTime());
}

function formatTime(time: Date) {
  return time.toISOString().replace(".000Z", "Z");
}

function durationMinutes(events: IncidentEvent[]) {
  if (events.length < 2) return 0;

  return Math.round(((events[events.length - 1]?.time.getTime() ?? 0) - (events[0]?.time.getTime() ?? 0)) / 60000);
}

function severitySummary(events: IncidentEvent[]) {
  const counts = new Map<string, number>();
  events.forEach((event) => counts.set(event.severity, (counts.get(event.severity) ?? 0) + 1));

  return Array.from(counts.entries()).map(([severity, count]) => `${severity}: ${count}`).join(" / ") || "none";
}

function buildTimeline(events: IncidentEvent[]) {
  return events.map((event) => `- ${formatTime(event.time)} [${event.severity}] ${event.actor}: ${event.message}`).join("\n");
}

function buildStatusUpdate(events: IncidentEvent[]) {
  const latest = events[events.length - 1];
  if (!latest) return "No incident events parsed.";

  return `Current status: ${latest.message}
Severity: ${latest.severity}
Last update: ${formatTime(latest.time)}
Timeline length: ${durationMinutes(events)} minutes`;
}

function buildPostmortem(events: IncidentEvent[], title: string) {
  return `# ${title}

## Summary

Incident duration: ${durationMinutes(events)} minutes
Severity mix: ${severitySummary(events)}

## Timeline

${buildTimeline(events)}

## Impact

- Affected users/services:
- Customer-visible symptoms:

## Root Cause

- Primary trigger:
- Contributing factors:

## Corrective Actions

- [ ] Owner / action / due date`;
}

function buildOutput(mode: OutputMode, events: IncidentEvent[], title: string) {
  if (mode === "status") return buildStatusUpdate(events);
  if (mode === "postmortem") return buildPostmortem(events, title);

  return buildTimeline(events);
}

export default function IncidentTimelineGeneratorTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleEvents);
  const [title, setTitle] = useState("Checkout API elevated 5xx");
  const [mode, setMode] = useState<OutputMode>("timeline");
  const events = useMemo(() => parseEvents(source), [source]);
  const output = buildOutput(mode, events, title);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Incident Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as OutputMode)}>
            <option value="timeline">时间线</option>
            <option value="status">状态更新</option>
            <option value="postmortem">复盘草稿</option>
          </select>
        </label>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyOutput()}>复制输出</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>事件记录</span>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>生成结果</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Events</h3>
          <p>{events.length}</p>
        </article>
        <article className="detail-card">
          <h3>Duration</h3>
          <p>{durationMinutes(events)} min</p>
        </article>
        <article className="detail-card">
          <h3>First Event</h3>
          <p>{events[0] ? formatTime(events[0].time) : "none"}</p>
        </article>
        <article className="detail-card">
          <h3>Severity</h3>
          <p>{severitySummary(events)}</p>
        </article>
      </div>
      <p className="tool-note">事件格式：ISO 时间 | 参与者 | 级别 | 事件描述。</p>
    </section>
  );
}
