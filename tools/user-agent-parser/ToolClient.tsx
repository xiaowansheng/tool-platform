"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function matchFirst(input: string, patterns: Array<[string, RegExp]>) {
  for (const [label, pattern] of patterns) {
    const match = input.match(pattern);

    if (match) {
      return match[1] ? `${label} ${match[1]}` : label;
    }
  }

  return "Unknown";
}

function parseUserAgent(input: string) {
  return {
    browser: matchFirst(input, [
      ["Edge", /Edg\/([\d.]+)/],
      ["Chrome", /Chrome\/([\d.]+)/],
      ["Firefox", /Firefox\/([\d.]+)/],
      ["Safari", /Version\/([\d.]+).*Safari/]
    ]),
    os: matchFirst(input, [
      ["Windows", /Windows NT ([\d.]+)/],
      ["macOS", /Mac OS X ([\d_]+)/],
      ["iOS", /OS ([\d_]+) like Mac OS X/],
      ["Android", /Android ([\d.]+)/],
      ["Linux", /Linux/]
    ]),
    engine: matchFirst(input, [
      ["Blink", /Chrome\/[\d.]+/],
      ["Gecko", /Gecko\/[\d.]+/],
      ["WebKit", /AppleWebKit\/([\d.]+)/]
    ]),
    device: /Mobile|iPhone|Android/.test(input) ? "Mobile" : /Tablet|iPad/.test(input) ? "Tablet" : "Desktop / unknown"
  };
}

export default function UserAgentParserTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
  const result = parseUserAgent(input);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Network Debugging</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>User-Agent</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        {Object.entries(result).map(([key, value]) => (
          <article key={key} className="detail-card">
            <h3>{key}</h3>
            <p>{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
