"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const commitTypes = [
  ["feat", "新功能"],
  ["fix", "缺陷修复"],
  ["docs", "文档"],
  ["style", "格式/样式"],
  ["refactor", "重构"],
  ["perf", "性能"],
  ["test", "测试"],
  ["build", "构建"],
  ["ci", "CI"],
  ["chore", "维护"],
  ["revert", "回滚"]
];

function buildCommitMessage(type: string, scope: string, description: string, body: string, breaking: boolean, breakingDescription: string, footer: string) {
  const normalizedScope = scope.trim().replace(/\s+/g, "-").toLowerCase();
  const subject = `${type}${normalizedScope ? `(${normalizedScope})` : ""}${breaking ? "!" : ""}: ${description.trim()}`;
  const sections = [subject];

  if (body.trim()) {
    sections.push(body.trim());
  }

  if (breaking && breakingDescription.trim()) {
    sections.push(`BREAKING CHANGE: ${breakingDescription.trim()}`);
  }

  if (footer.trim()) {
    sections.push(footer.trim());
  }

  return sections.join("\n\n");
}

function validateCommit(subject: string, description: string, breaking: boolean, breakingDescription: string) {
  const issues: string[] = [];

  if (!description.trim()) {
    issues.push("subject 描述不能为空。");
  }

  if (subject.length > 72) {
    issues.push(`subject 当前 ${subject.length} 个字符，建议不超过 72。`);
  }

  if (/^[A-Z]/.test(description.trim())) {
    issues.push("description 建议使用小写动词开头。");
  }

  if (/[.!。！]$/.test(description.trim())) {
    issues.push("description 末尾通常不加句号。");
  }

  if (breaking && !breakingDescription.trim()) {
    issues.push("破坏性变更需要补充 BREAKING CHANGE 说明。");
  }

  return issues;
}

export default function ConventionalCommitHelperTool({ manifest }: ToolClientProps) {
  const [type, setType] = useState("feat");
  const [scope, setScope] = useState("auth");
  const [description, setDescription] = useState("add passkey enrollment");
  const [body, setBody] = useState("Store passkey metadata with the user profile and expose enrollment status to the settings page.");
  const [breaking, setBreaking] = useState(false);
  const [breakingDescription, setBreakingDescription] = useState("");
  const [footer, setFooter] = useState("Closes #128");
  const [copied, setCopied] = useState(false);
  const commitMessage = buildCommitMessage(type, scope, description, body, breaking, breakingDescription, footer);
  const subject = commitMessage.split("\n")[0] ?? "";
  const issues = validateCommit(subject, description, breaking, breakingDescription);

  async function copyCommit() {
    await navigator.clipboard.writeText(commitMessage);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Git Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {commitTypes.map(([value, label]) => <option key={value} value={value}>{value} - {label}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>Scope</span>
          <input value={scope} onChange={(event) => setScope(event.target.value)} />
        </label>
      </div>
      <label className="tool-check">
        <input type="checkbox" checked={breaking} onChange={(event) => setBreaking(event.target.checked)} />
        <span>Breaking change</span>
      </label>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Description</span>
            <input value={description} onChange={(event) => {
              setDescription(event.target.value);
              setCopied(false);
            }} />
          </label>
          <label className="tool-field">
            <span>Body</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Breaking description</span>
            <textarea value={breakingDescription} onChange={(event) => setBreakingDescription(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Footer</span>
            <input value={footer} onChange={(event) => setFooter(event.target.value)} />
          </label>
        </div>
        <div className="workspace workspace--stack">
          <button type="button" onClick={() => void copyCommit()}>{copied ? "已复制" : "复制 Commit Message"}</button>
          <label className="tool-field">
            <span>Commit message</span>
            <textarea value={commitMessage} readOnly spellCheck={false} />
          </label>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>Check</span>
              <span>Result</span>
            </div>
            {issues.length > 0 ? issues.map((issue) => (
              <div className="tool-table__row" key={issue}>
                <span>Warning</span>
                <span>{issue}</span>
              </div>
            )) : (
              <div className="tool-table__row">
                <span>OK</span>
                <span>提交信息符合基础 Conventional Commit 规则</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
