"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function buildScript(input: {
  badRef: string;
  goodRef: string;
  testCommand: string;
  pathspec: string;
  skipPattern: string;
}) {
  const pathspec = input.pathspec.trim() ? ` -- ${input.pathspec.trim()}` : "";
  const skipLine = input.skipPattern.trim() ? `# Optional skip example:
# git bisect skip ${input.skipPattern.trim()}
` : "";

  return `#!/usr/bin/env bash
set -euo pipefail

git status --short
git bisect start ${input.badRef.trim()} ${input.goodRef.trim()}${pathspec}
${skipLine}git bisect run bash -lc ${JSON.stringify(input.testCommand.trim())}

# After review:
# git bisect reset`;
}

function estimateSteps(goodRef: string, badRef: string, commitCount: number) {
  const bounded = Math.max(1, commitCount);
  return {
    steps: Math.ceil(Math.log2(bounded)),
    command: `git rev-list --count ${goodRef.trim()}..${badRef.trim()}`
  };
}

export default function GitBisectPlannerTool({ manifest }: ToolClientProps) {
  const [badRef, setBadRef] = useState("main");
  const [goodRef, setGoodRef] = useState("v1.8.0");
  const [commitCount, setCommitCount] = useState(256);
  const [testCommand, setTestCommand] = useState("pnpm test -- --runInBand");
  const [pathspec, setPathspec] = useState("apps/web packages/tool-sdk");
  const [skipPattern, setSkipPattern] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const estimate = useMemo(() => estimateSteps(goodRef, badRef, commitCount), [badRef, commitCount, goodRef]);
  const script = useMemo(() => buildScript({ badRef, goodRef, testCommand, pathspec, skipPattern }), [badRef, goodRef, pathspec, skipPattern, testCommand]);
  const checklist = [
    "确认 good ref 上测试稳定通过，bad ref 上稳定失败。",
    "让 test command 返回 0=good，非 0=bad；不确定时返回 125 触发 skip。",
    "如果失败依赖外部服务，先固定 mock、seed 和环境变量。",
    "bisect 结束后阅读 culprit commit 周边变更，不只看最终 SHA。",
    "最后执行 git bisect reset。"
  ];

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
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
          <p className="eyebrow">Git</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>Bad ref</span><input value={badRef} onChange={(event) => setBadRef(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>Good ref</span><input value={goodRef} onChange={(event) => setGoodRef(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>估计 commits</span><input type="number" min="1" value={commitCount} onChange={(event) => setCommitCount(Number(event.target.value))} /></label>
        <button type="button" onClick={() => void copyScript()}>{copied ? "已复制" : "复制脚本"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>Steps</h3><p>{estimate.steps}</p></article>
        <article className="detail-card"><h3>Range cmd</h3><p>{estimate.command}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>测试命令</span><input value={testCommand} onChange={(event) => setTestCommand(event.target.value)} /></label>
          <label className="tool-field"><span>Pathspec</span><input value={pathspec} onChange={(event) => setPathspec(event.target.value)} /></label>
          <label className="tool-field"><span>Skip ref/pattern</span><input value={skipPattern} onChange={(event) => setSkipPattern(event.target.value)} placeholder="optional" /></label>
          <div className="tool-table">
            {checklist.map((item, index) => (
              <div className="tool-table__row" key={item}><span>{index + 1}</span><span>{item}</span></div>
            ))}
          </div>
        </div>
        <label className="tool-field">
          <span>Bisect script</span>
          <textarea value={script} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">自动 bisect 依赖可重复的测试命令；flaky 测试会把搜索结果带偏，必要时先把失败条件收窄成最小复现脚本。</p>
    </section>
  );
}
