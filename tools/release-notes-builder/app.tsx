"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const audiences = ["Users", "Developers", "Operators", "Internal"];

const MODES = ["Form", "From Commits"] as const;

type CommitGroup = "feat" | "fix" | "chore" | "docs" | "refactor" | "perf" | "test" | "style" | "build" | "ci" | "revert";

const groupLabels: Record<CommitGroup, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  chore: "Chores",
  docs: "Documentation",
  refactor: "Refactors",
  perf: "Performance",
  test: "Tests",
  style: "Style",
  build: "Build",
  ci: "CI",
  revert: "Reverts"
};

function parseConventionalCommits(text: string) {
  const groups: Partial<Record<CommitGroup, string[]>> = {};
  const pattern = /^(?<type>\w+)(?:\((?<scope>[^)]*)\))?:\s*(?<description>.+)$/gm;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const type = match.groups?.type as CommitGroup;
    const description = `**${match.groups?.scope ? `${match.groups.scope}: ` : ""}${match.groups?.description ?? ""}`;

    if (type && groupLabels[type]) {
      (groups[type] ??= []).push(description);
    }
  }

  return groups;
}

function renderChangelog(commits: string, version: string) {
  const groups = parseConventionalCommits(commits);
  const types = Object.keys(groupLabels) as CommitGroup[];
  const sections = types
    .map((type) => {
      const items = groups[type];
      return items ? `## ${groupLabels[type]}\n\n${items.map((item) => `- ${item}`).join("\n")}` : "";
    })
    .filter(Boolean);
  return [`# ${version || "Unreleased"}`, "", ...sections].join("\n");
}

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

function useCopy() {
  const [copied, setCopied] = useState(false);

  return {
    copied,
    async copy(value: string) {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    },
    reset: () => setCopied(false)
  };
}

export default function ReleaseNotesBuilderTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<(typeof MODES)[number]>("Form");
  const copy = useCopy();
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
  const [commits, setCommits] = useState("feat: add user profile page\nfix(api): handle null response on timeout\nchore: bump dependencies\nfeat: add dark mode toggle");
  const [commitsVersion, setCommitsVersion] = useState("v1.5.0");
  const notes = buildReleaseNotes(version, date, audience, summary, highlights, fixes, breakingChanges, migration, contributors, links);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">发布工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        {MODES.map((m) => (
          <button key={m} type="button" className={mode === m ? "tool-toolbar__btn tool-toolbar__btn--active" : "tool-toolbar__btn"} onClick={() => setMode(m)}>{m}</button>
        ))}
      </div>
      {mode === "Form" ? (
        <>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>版本</span>
              <input value={version} onChange={(event) => setVersion(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>日期</span>
              <input value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>受众</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                {audiences.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void copy.copy(notes)}>{copy.copied ? "已复制" : "复制发布说明"}</button>
          </div>
          <div className="workspace workspace--two-column">
            <div className="workspace workspace--stack">
              <label className="tool-field">
                <span>概要</span>
                <textarea value={summary} onChange={(event) => {
                  setSummary(event.target.value);
                  copy.reset();
                }} spellCheck={false} />
              </label>
              <label className="tool-field">
                <span>亮点</span>
                <textarea value={highlights} onChange={(event) => setHighlights(event.target.value)} spellCheck={false} />
              </label>
              <label className="tool-field">
                <span>修复</span>
                <textarea value={fixes} onChange={(event) => setFixes(event.target.value)} spellCheck={false} />
              </label>
            </div>
            <div className="workspace workspace--stack">
              <label className="tool-field">
                <span>破坏性变更</span>
                <textarea value={breakingChanges} onChange={(event) => setBreakingChanges(event.target.value)} spellCheck={false} />
              </label>
              <label className="tool-field">
                <span>升级说明</span>
                <textarea value={migration} onChange={(event) => setMigration(event.target.value)} spellCheck={false} />
              </label>
              <label className="tool-field">
                <span>贡献者 / 链接</span>
                <textarea value={`${contributors}\n\n${links}`} onChange={(event) => {
                  const [nextContributors = "", ...nextLinks] = event.target.value.split(/\n\s*\n/);
                  setContributors(nextContributors);
                  setLinks(nextLinks.join("\n\n"));
                }} spellCheck={false} />
              </label>
            </div>
          </div>
          <label className="tool-field">
            <span>发布说明</span>
            <textarea value={notes} readOnly spellCheck={false} />
          </label>
        </>
      ) : (
        <>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>版本</span>
              <input value={commitsVersion} onChange={(event) => setCommitsVersion(event.target.value)} />
            </label>
            <button type="button" onClick={() => void copy.copy(renderChangelog(commits, commitsVersion))}>{copy.copied ? "已复制" : "复制变更日志"}</button>
          </div>
          <label className="tool-field">
            <span>提交记录（每一行一个 conventional commit）</span>
            <textarea value={commits} onChange={(event) => { setCommits(event.target.value); copy.reset(); }} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>变更日志</span>
            <textarea value={renderChangelog(commits, commitsVersion)} readOnly spellCheck={false} />
          </label>
        </>
      )}
    </section>
  );
}
