"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface Version { major: number; minor: number; patch: number; prerelease: string; raw: string }
function parseVersion(value: string): Version | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? "", raw: value.trim() };
}
function compare(a: Version, b: Version) {
  for (const key of ["major", "minor", "patch"] as const) if (a[key] !== b[key]) return a[key] - b[key];
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}
function bump(version: Version, type: "major" | "minor" | "patch") {
  if (type === "major") return `${version.major + 1}.0.0`;
  if (type === "minor") return `${version.major}.${version.minor + 1}.0`;
  return `${version.major}.${version.minor}.${version.patch + 1}`;
}
function satisfies(version: Version, range: string) {
  const trimmed = range.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("^")) {
    const base = parseVersion(trimmed.slice(1));
    return !!base && compare(version, base) >= 0 && version.major === base.major;
  }
  if (trimmed.startsWith("~")) {
    const base = parseVersion(trimmed.slice(1));
    return !!base && compare(version, base) >= 0 && version.major === base.major && version.minor === base.minor;
  }
  const match = trimmed.match(/^(>=|<=|>|<|=)?\s*(.+)$/);
  const base = match ? parseVersion(match[2]) : null;
  if (!base) return false;
  const cmp = compare(version, base);
  const op = match?.[1] ?? "=";
  return op === ">=" ? cmp >= 0 : op === "<=" ? cmp <= 0 : op === ">" ? cmp > 0 : op === "<" ? cmp < 0 : cmp === 0;
}

export default function SemverCalculatorTool({ manifest }: ToolAppProps) {
  const [left, setLeft] = useState("1.4.2");
  const [right, setRight] = useState("1.5.0-beta.1");
  const [range, setRange] = useState("^1.4.0");
  const [list, setList] = useState("1.0.0\n1.0.0-beta.1\n2.0.0\n1.10.0\n1.2.3");
  const result = useMemo(() => {
    const a = parseVersion(left);
    const b = parseVersion(right);
    const sorted = list.split(/\r?\n/).map(parseVersion).filter((item): item is Version => Boolean(item)).sort(compare).map((item) => item.raw).join("\n");
    return { a, b, cmp: a && b ? compare(a, b) : null, sorted };
  }, [left, list, right]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Versions</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>版本 A</span><input value={left} onChange={(event) => setLeft(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>版本 B</span><input value={right} onChange={(event) => setRight(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>范围</span><input value={range} onChange={(event) => setRange(event.target.value)} /></label>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>比较</h3><p>{result.cmp === null ? "无效版本" : result.cmp === 0 ? "A = B" : result.cmp > 0 ? "A > B" : "A < B"}</p></article>
        <article className="detail-card"><h3>A major</h3><p>{result.a ? bump(result.a, "major") : "-"}</p></article>
        <article className="detail-card"><h3>A minor</h3><p>{result.a ? bump(result.a, "minor") : "-"}</p></article>
        <article className="detail-card"><h3>A patch</h3><p>{result.a ? bump(result.a, "patch") : "-"}</p></article>
        <article className="detail-card"><h3>A 满足范围</h3><p>{result.a ? (satisfies(result.a, range) ? "是" : "否") : "-"}</p></article>
        <article className="detail-card"><h3>B 满足范围</h3><p>{result.b ? (satisfies(result.b, range) ? "是" : "否") : "-"}</p></article>
      </div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>版本列表</span><textarea value={list} onChange={(event) => setList(event.target.value)} rows={8} /></label><label className="tool-field"><span>排序结果</span><textarea value={result.sorted} readOnly rows={8} /></label></div>
    </section>
  );
}
