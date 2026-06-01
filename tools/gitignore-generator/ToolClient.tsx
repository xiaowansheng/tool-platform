"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const templates = {
  Node: ["node_modules/", ".env", ".env.*", "npm-debug.log*", "pnpm-debug.log*", "dist/", "coverage/"],
  Next: [".next/", "out/", "next-env.d.ts"],
  Python: ["__pycache__/", "*.py[cod]", ".venv/", "venv/", ".pytest_cache/", "dist/"],
  macOS: [".DS_Store", ".AppleDouble", ".LSOverride"],
  Windows: ["Thumbs.db", "Desktop.ini", "$RECYCLE.BIN/"],
  IDE: [".idea/", ".vscode/*", "!.vscode/extensions.json"]
};

type TemplateName = keyof typeof templates;

function buildGitignore(selected: Record<TemplateName, boolean>, custom: string) {
  const sections = (Object.keys(templates) as TemplateName[])
    .filter((name) => selected[name])
    .map((name) => [`# ${name}`, ...templates[name]].join("\n"));

  if (custom.trim()) {
    sections.push(`# Custom\n${custom.trim()}`);
  }

  return sections.join("\n\n");
}

export default function GitignoreGeneratorTool({ manifest }: ToolClientProps) {
  const [selected, setSelected] = useState<Record<TemplateName, boolean>>({
    Node: true,
    Next: true,
    Python: false,
    macOS: true,
    Windows: true,
    IDE: true
  });
  const [custom, setCustom] = useState("*.local\n.cache/");
  const [copied, setCopied] = useState(false);
  const output = buildGitignore(selected, custom);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">开发者工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-option-list">
        {(Object.keys(templates) as TemplateName[]).map((name) => (
          <label key={name} className="tool-check">
            <input
              type="checkbox"
              checked={selected[name]}
              onChange={(event) => setSelected((current) => ({ ...current, [name]: event.target.checked }))}
            />
            <span>{name}</span>
          </label>
        ))}
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyOutput()}>
          {copied ? "已复制" : "复制 .gitignore"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>自定义规则</span>
          <textarea value={custom} onChange={(event) => setCustom(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>.gitignore</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
