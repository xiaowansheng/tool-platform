"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface ParsedCommit {
  type: string;
  scope: string;
  description: string;
  breaking: boolean;
}

const sampleCommits = `feat(auth): add passkey enrollment
fix(api): normalize 401 error response
perf(search): cache normalized query tokens
docs(readme): add local development section
refactor!: drop legacy config loader
chore: update dependencies`;

const changelogSections: Array<[string, string[]]> = [
  ["Added", ["feat"]],
  ["Fixed", ["fix"]],
  ["Changed", ["refactor", "perf", "style"]],
  ["Documentation", ["docs"]],
  ["Tests", ["test"]],
  ["Maintenance", ["build", "ci", "chore", "revert"]]
];

function parseCommit(line: string): ParsedCommit | null {
  const match = line.trim().match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);

  if (!match) {
    return null;
  }

  return {
    type: match[1] ?? "other",
    scope: match[2] ?? "",
    breaking: Boolean(match[3]),
    description: match[4] ?? ""
  };
}

function formatCommitItem(commit: ParsedCommit) {
  const scope = commit.scope ? `**${commit.scope}:** ` : "";
  const breaking = commit.breaking ? " **BREAKING**" : "";

  return `- ${scope}${commit.description}${breaking}`;
}

function generateChangelog(commitsText: string, version: string, date: string, previousVersion: string, repoUrl: string) {
  const parsedCommits: ParsedCommit[] = [];
  const uncategorized: string[] = [];

  for (const line of commitsText.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const parsed = parseCommit(line);

    if (parsed) {
      parsedCommits.push(parsed);
    } else {
      uncategorized.push(`- ${line.trim()}`);
    }
  }

  const output = [`## ${version.trim() || "Unreleased"} - ${date.trim() || new Date().toISOString().slice(0, 10)}`];
  const breakingChanges = parsedCommits.filter((commit) => commit.breaking);

  if (breakingChanges.length > 0) {
    output.push("", "### Breaking Changes", ...breakingChanges.map(formatCommitItem));
  }

  for (const [section, types] of changelogSections) {
    const commits = parsedCommits.filter((commit) => types.includes(commit.type) && !commit.breaking);

    if (commits.length > 0) {
      output.push("", `### ${section}`, ...commits.map(formatCommitItem));
    }
  }

  if (uncategorized.length > 0) {
    output.push("", "### Uncategorized", ...uncategorized);
  }

  if (repoUrl.trim() && previousVersion.trim() && version.trim()) {
    const baseUrl = repoUrl.trim().replace(/\/$/, "");
    output.push("", `[Full diff](${baseUrl}/compare/v${previousVersion.trim().replace(/^v/, "")}...v${version.trim().replace(/^v/, "")})`);
  }

  return output.join("\n");
}

export default function ChangelogGeneratorTool({ manifest }: ToolClientProps) {
  const [commits, setCommits] = useState(sampleCommits);
  const [version, setVersion] = useState("v1.4.0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [previousVersion, setPreviousVersion] = useState("v1.3.0");
  const [repoUrl, setRepoUrl] = useState("https://github.com/example/tool-platform");
  const [copied, setCopied] = useState(false);
  const changelog = generateChangelog(commits, version, date, previousVersion, repoUrl);

  async function copyChangelog() {
    await navigator.clipboard.writeText(changelog);
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
          <span>Previous version</span>
          <input value={previousVersion} onChange={(event) => setPreviousVersion(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Repository URL</span>
          <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
        </label>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyChangelog()}>{copied ? "已复制" : "复制 Changelog"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Commit list</span>
          <textarea value={commits} onChange={(event) => {
            setCommits(event.target.value);
            setCopied(false);
          }} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>CHANGELOG.md section</span>
          <textarea value={changelog} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
