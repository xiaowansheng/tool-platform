"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function buildUtmUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) {
      url.searchParams.set(key, value.trim());
    } else {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

export default function UtmBuilderTool({ manifest }: ToolClientProps) {
  const [baseUrl, setBaseUrl] = useState("https://example.com/landing");
  const [source, setSource] = useState("newsletter");
  const [medium, setMedium] = useState("email");
  const [campaign, setCampaign] = useState("launch");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("hero_cta");
  const [copied, setCopied] = useState(false);

  let output = "";
  let error = "";

  try {
    output = buildUtmUrl(baseUrl, {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      utm_term: term,
      utm_content: content
    });
  } catch (buildError) {
    error = buildError instanceof Error ? buildError.message : "URL 无法解析";
  }

  async function handleCopy() {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Marketing Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Base URL</span>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>Source</span>
              <input value={source} onChange={(event) => setSource(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Medium</span>
              <input value={medium} onChange={(event) => setMedium(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Campaign</span>
              <input value={campaign} onChange={(event) => setCampaign(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Term</span>
              <input value={term} onChange={(event) => setTerm(event.target.value)} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>Content</span>
              <input value={content} onChange={(event) => setContent(event.target.value)} />
            </label>
          </div>
        </div>
        <label className="tool-field">
          <span>Campaign URL</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制链接"}
        </button>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
