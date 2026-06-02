"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleNames = `Ada
Linus
Grace
Alan
Katherine
Ken
Margaret
Dennis
Barbara
Donald`;

function hashSeed(seed: string) {
  let value = 2166136261;

  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function random(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(48271, value) % 0x7fffffff;
    return (value & 0x7fffffff) / 0x7fffffff;
  };
}

function buildTeams(names: string[], teamCount: number, seed: string) {
  const rand = random(hashSeed(seed));
  const shuffled = [...names].sort(() => rand() - 0.5);
  const teams = Array.from({ length: Math.max(1, teamCount) }, () => [] as string[]);

  shuffled.forEach((name, index) => teams[index % teams.length].push(name));
  return teams;
}

export default function RandomTeamGeneratorTool({ manifest }: ToolAppProps) {
  const [namesText, setNamesText] = useState(sampleNames);
  const [teamCount, setTeamCount] = useState(3);
  const [seed, setSeed] = useState("tool-platform");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const names = useMemo(() => namesText.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean), [namesText]);
  const teams = useMemo(() => buildTeams(names, teamCount, seed), [names, seed, teamCount]);
  const output = teams.map((team, index) => `第 ${index + 1} 组：${team.join(", ")}`).join("\n");

  async function copyTeams() {
    try {
      await navigator.clipboard.writeText(output);
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
          <p className="eyebrow">随机工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>队伍数量</span><input type="number" min="1" max="20" value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>种子</span><input value={seed} onChange={(event) => setSeed(event.target.value)} /></label>
        <button type="button" onClick={() => setSeed(String(Date.now()))}>随机种子</button>
        <button type="button" onClick={() => void copyTeams()}>{copied ? "已复制" : "复制分组"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>成员数</h3><p>{names.length}</p></article>
        <article className="detail-card"><h3>队伍数</h3><p>{teams.length}</p></article>
        <article className="detail-card"><h3>最大组</h3><p>{Math.max(0, ...teams.map((team) => team.length))}</p></article>
        <article className="detail-card"><h3>最小组</h3><p>{Math.min(...teams.map((team) => team.length))}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>名单</span>
          <textarea value={namesText} onChange={(event) => {
            setNamesText(event.target.value);
            setCopied(false);
          }} />
        </label>
        <div className="workspace workspace--stack">
          {teams.map((team, index) => (
            <article className="detail-card" key={`team-${index}`}>
              <h3>第 {index + 1} 组</h3>
              <p>{team.join(", ") || "-"}</p>
            </article>
          ))}
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">相同 seed 和名单会得到相同结果，方便公开透明地复现分组。</p>
    </section>
  );
}
