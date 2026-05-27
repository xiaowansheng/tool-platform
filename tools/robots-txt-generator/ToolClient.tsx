"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function linesFromText(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function buildRobots(userAgent: string, allow: string, disallow: string, sitemap: string) {
  const lines = [`User-agent: ${userAgent.trim() || "*"}`];

  for (const path of linesFromText(allow)) {
    lines.push(`Allow: ${path}`);
  }

  for (const path of linesFromText(disallow)) {
    lines.push(`Disallow: ${path}`);
  }

  if (sitemap.trim()) {
    lines.push("", `Sitemap: ${sitemap.trim()}`);
  }

  return lines.join("\n");
}

export default function RobotsTxtGeneratorTool({ manifest }: ToolClientProps) {
  const [userAgent, setUserAgent] = useState("*");
  const [allow, setAllow] = useState("/");
  const [disallow, setDisallow] = useState("/admin\n/api");
  const [sitemap, setSitemap] = useState("https://example.com/sitemap.xml");
  const [copied, setCopied] = useState(false);
  const output = buildRobots(userAgent, allow, disallow, sitemap);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">SEO Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>User-agent</span>
          <input value={userAgent} onChange={(event) => setUserAgent(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyOutput()}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Allow 路径，每行一个</span>
            <textarea value={allow} onChange={(event) => setAllow(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Disallow 路径，每行一个</span>
            <textarea value={disallow} onChange={(event) => setDisallow(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>Sitemap URL</span>
            <input value={sitemap} onChange={(event) => setSitemap(event.target.value)} />
          </label>
        </div>
        <label className="tool-field">
          <span>robots.txt</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
    </section>
  );
}
