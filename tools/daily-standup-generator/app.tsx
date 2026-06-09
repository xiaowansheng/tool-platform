"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function cleanCommit(line: string) {
  return line
    .replace(/^[-*]\s*/, "")
    .replace(/^[a-f0-9]{7,40}\s+/i, "")
    .replace(/^\w+(\(.+?\))?:\s*/, "")
    .trim();
}

function toBullets(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => cleanCommit(line))
    .filter(Boolean)
    .map((line) => `- ${line}`);
}

export default function DailyStandupGeneratorTool({ manifest }: ToolAppProps) {
  const [name, setName] = useState("Tool Platform");
  const [commits, setCommits] = useState("8a15127 test: add web regression coverage\n7ea3cbb test: cover stats API routing\nfix: improve tool preview safety");
  const [today, setToday] = useState("继续补齐工具页面功能\n补充类型检查和构建验证");
  const [blockers, setBlockers] = useState("");
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    const yesterday = toBullets(commits);
    const todayItems = toBullets(today);
    const blockerItems = toBullets(blockers);

    return [
      `# Daily Standup - ${name}`,
      "",
      "## Yesterday",
      ...(yesterday.length ? yesterday : ["- No completed work recorded."]),
      "",
      "## Today",
      ...(todayItems.length ? todayItems : ["- Continue current priority work."]),
      "",
      "## Blockers",
      ...(blockerItems.length ? blockerItems : ["- None."]),
      "",
      "## Risks / Notes",
      `- ${yesterday.length} completed item(s), ${todayItems.length} planned item(s).`
    ].join("\n");
  }, [blockers, commits, name, today]);

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Agile Update</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>项目 / 汇报对象</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" className="button--primary" onClick={() => void copyReport()}>
          {copied ? "已复制" : "复制站会稿"}
        </button>
      </div>

      <div className="workspace workspace--two-column">
        <div>
          <label className="tool-field">
            <span>昨天完成，可粘贴 git log --oneline</span>
            <textarea value={commits} onChange={(event) => { setCommits(event.target.value); setCopied(false); }} rows={7} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>今天计划</span>
            <textarea value={today} onChange={(event) => { setToday(event.target.value); setCopied(false); }} rows={5} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>阻塞点，可留空</span>
            <textarea value={blockers} onChange={(event) => { setBlockers(event.target.value); setCopied(false); }} rows={3} spellCheck={false} />
          </label>
        </div>
        <label className="tool-field">
          <span>生成结果</span>
          <textarea value={report} readOnly rows={18} spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
