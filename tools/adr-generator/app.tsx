"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const statuses = ["Proposed", "Accepted", "Deprecated", "Superseded"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAdr(number: string, title: string, status: string, date: string, owner: string, context: string, decision: string, alternatives: string, consequences: string) {
  const normalizedNumber = number.trim().padStart(4, "0");

  return [
    `# ADR-${normalizedNumber}: ${title.trim() || "Untitled Decision"}`,
    "",
    `Status: ${status}`,
    `Date: ${date.trim() || new Date().toISOString().slice(0, 10)}`,
    owner.trim() ? `Owner: ${owner.trim()}` : "",
    "",
    "## Context",
    "",
    context.trim() || "Describe the forces, constraints, and problem that led to this decision.",
    "",
    "## Decision",
    "",
    decision.trim() || "Describe the decision and the policy it creates.",
    "",
    "## Alternatives Considered",
    "",
    alternatives.trim() || "- Option A\n- Option B\n- Do nothing",
    "",
    "## Consequences",
    "",
    consequences.trim() || "- Positive consequence\n- Tradeoff or follow-up"
  ].filter((line) => line !== "").join("\n");
}

export default function AdrGeneratorTool({ manifest }: ToolAppProps) {
  const [number, setNumber] = useState("7");
  const [title, setTitle] = useState("Use Worker Runtime for Heavy Browser Tools");
  const [status, setStatus] = useState("Accepted");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [owner, setOwner] = useState("Platform Team");
  const [context, setContext] = useState("Some tools need to parse large documents or run expensive analysis without blocking the main UI thread.");
  const [decision, setDecision] = useState("Heavy browser tools will use the shared Worker runtime and keep UI components as thin clients.");
  const [alternatives, setAlternatives] = useState("- Run all logic on the React thread\n- Create one-off workers per tool\n- Move parsing to a backend service");
  const [consequences, setConsequences] = useState("- UI remains responsive during large local tasks\n- Tool authors need to follow the runtime lifecycle\n- Worker RPC errors must be surfaced clearly");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const adr = buildAdr(number, title, status, date, owner, context, decision, alternatives, consequences);
  const fileName = `${number.trim().padStart(4, "0")}-${slugify(title) || "decision"}.md`;

  async function copyAdr() {
    try {
      await navigator.clipboard.writeText(adr);
      setCopied(true);
      setCopyError("");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopyError("复制失败，请检查权限");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">架构工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>ADR 编号</span>
          <input value={number} onChange={(event) => setNumber(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>状态</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>日期</span>
          <input value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyAdr()}>{copied ? "已复制" : "复制 ADR"}</button>
      </div>
      <div className="detail-card">
        <h3>文件名</h3>
        <p className="mono-output">{fileName}</p>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>标题</span>
            <input value={title} onChange={(event) => {
              setTitle(event.target.value);
              setCopied(false);
            }} />
          </label>
          <label className="tool-field">
            <span>负责人</span>
            <input value={owner} onChange={(event) => setOwner(event.target.value)} />
          </label>
          <label className="tool-field">
            <span>背景</span>
            <textarea value={context} onChange={(event) => setContext(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>决策</span>
            <textarea value={decision} onChange={(event) => setDecision(event.target.value)} spellCheck={false} />
          </label>
        </div>
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>备选方案</span>
            <textarea value={alternatives} onChange={(event) => setAlternatives(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>影响</span>
            <textarea value={consequences} onChange={(event) => setConsequences(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>ADR Markdown</span>
            <textarea value={adr} readOnly spellCheck={false} />
          </label>
        </div>
      </div>
      {copyError ? <p className="tool-error">{copyError}</p> : null}
      <p className="tool-note">ADR（Architecture Decision Record）用于记录重要的架构决策，便于团队回顾和追踪决策背景。</p>
    </section>
  );
}
