"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleResume = [
  "# Ada Chen",
  "Frontend Engineer | ada@example.com | github.com/ada",
  "",
  "## Summary",
  "Builds design systems, data-heavy React apps, and reliable developer tooling.",
  "",
  "## Experience",
  "- Senior Engineer, Tool Platform: shipped 80+ browser tools and improved build stability.",
  "- UI Engineer, Commerce Cloud: led checkout performance work and accessibility audits.",
  "",
  "## Skills",
  "React, TypeScript, Next.js, Accessibility, Performance"
].join("\n");

function parseSections(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const name = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") || "Your Name";
  const sections: Array<{ title: string; items: string[] }> = [];
  let current: { title: string; items: string[] } | null = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      current = { title: line.replace(/^##\s+/, ""), items: [] };
      sections.push(current);
    } else if (current && line.trim()) current.items.push(line.replace(/^-\s+/, ""));
  }
  return { name, sections };
}

export default function ResumeBuilderTool({ manifest }: ToolAppProps) {
  const [markdown, setMarkdown] = useState(sampleResume);
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => parseSections(markdown), [markdown]);
  const wordCount = useMemo(() => markdown.trim().split(/\s+/).filter(Boolean).length, [markdown]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Career docs</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><button type="button" onClick={() => setMarkdown(sampleResume)}>Load sample</button><button type="button" onClick={() => void copyMarkdown()}>{copied ? "Copied" : "Copy Markdown"}</button></div>
      <div className="detail-grid"><article className="detail-card"><h3>Words</h3><p>{wordCount}</p></article><article className="detail-card"><h3>Sections</h3><p>{parsed.sections.length}</p></article></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>Markdown resume</span><textarea value={markdown} onChange={(event) => { setMarkdown(event.target.value); setCopied(false); }} spellCheck={false} /></label><div className="detail-card"><h2>{parsed.name}</h2>{parsed.sections.map((section) => <section key={section.title} style={{ marginTop: 16 }}><h3>{section.title}</h3>{section.items.map((item) => <p key={item}>{item}</p>)}</section>)}</div></div>
    </section>
  );
}
