"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const audiences = ["Users", "Developers", "Operators", "Internal"];

function bulletLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter(Boolean);
}

function renderSection(title: string, lines: string[]) {
  if (lines.length === 0) {
    return "";
  }

  return [`## ${title}`, ...lines.map((line) => `- ${line}`)].join("\n");
}

function buildReleaseNotes(
  version: string,
  date: string,
  audience: string,
  summary: string,
  highlights: string,
  fixes: string,
  breakingChanges: string,
  migration: string,
  contributors: string,
  links: string
) {
  const sections = [
    `# Release ${version.trim() || "Unreleased"}`,
    `Date: ${date.trim() || new Date().toISOString().slice(0, 10)}`,
    `Audience: ${audience}`,
    "",
    summary.trim(),
    "",
    renderSection("Highlights", bulletLines(highlights)),
    renderSection("Fixes", bulletLines(fixes)),
    renderSection("Breaking Changes", bulletLines(breakingChanges)),
    renderSection("Upgrade Notes", bulletLines(migration)),
    renderSection("Contributors", bulletLines(contributors)),
    renderSection("Links", bulletLines(links))
  ];

  return sections.filter((section) => section.trim()).join("\n\n");
}

export default function ReleaseNotesBuilderTool({ manifest }: ToolClientProps) {
  const [version, setVersion] = useState("v1.4.0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [audience, setAudience] = useState("Users");
  const [summary, setSummary] = useState("This release improves documentation workflows and adds more local-first developer utilities.");
  const [highlights, setHighlights] = useState("Mermaid diagrams can be formatted before publishing\nREADME quality checks now flag missing setup details");
  const [fixes, setFixes] = useState("Normalize generated Markdown tables\nKeep release helper output stable across empty sections");
  const [breakingChanges, setBreakingChanges] = useState("");
  const [migration, setMigration] = useState("Run pnpm generate:tools after pulling the release");
  const [contributors, setContributors] = useState("@frontend-team\n@docs-team");
  const [links, setLinks] = useState("Full changelog: https://github.com/example/tool-platform/releases/tag/v1.4.0");
  const [copied, setCopied] = useState(false);
  const notes = buildReleaseNotes(version, date, audience, summary, highlights, fixes, breakingChanges, migration, contributors, links);

  async function copyNotes() {
    await navigator.clipboard.writeText(notes);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Release Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Version</span>
          <input value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Date</span>
          <input value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Audience</span>
          <select value={audience} onChange={(event) => setAudience(event.target.value)}>
            {audiences.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void copyNotes()}>{copied ? "已复制" : "复制 Release Notes"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Summary</span>
            <textarea value={summary} onChange={(event) => {
              setSummary(event.target.value);
              setCopied(false);
            }} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Highlights</span>
            <textarea value={highlights} onChange={(event) => setHighlights(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Fixes</span>
            <textarea value={fixes} onChange={(event) => setFixes(event.target.value)} spellCheck={false} />
          </label>
        </div>
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Breaking Changes</span>
            <textarea value={breakingChanges} onChange={(event) => setBreakingChanges(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Upgrade Notes</span>
            <textarea value={migration} onChange={(event) => setMigration(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Contributors / Links</span>
            <textarea value={`${contributors}\n\n${links}`} onChange={(event) => {
              const [nextContributors = "", ...nextLinks] = event.target.value.split(/\n\s*\n/);
              setContributors(nextContributors);
              setLinks(nextLinks.join("\n\n"));
            }} spellCheck={false} />
          </label>
        </div>
      </div>
      <label className="tool-field">
        <span>Release notes</span>
        <textarea value={notes} readOnly spellCheck={false} />
      </label>
    </section>
  );
}
