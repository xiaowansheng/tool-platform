"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function parseTimestamp(input: string) {
  const trimmed = input.trim();
  const numeric = Number(trimmed);

  if (Number.isFinite(numeric) && trimmed !== "") {
    return new Date(trimmed.length <= 10 ? numeric * 1000 : numeric);
  }

  return new Date(trimmed);
}

function formatDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new Error("无法解析时间输入");
  }

  return {
    unixSeconds: Math.floor(date.getTime() / 1000).toString(),
    unixMilliseconds: date.getTime().toString(),
    iso: date.toISOString(),
    local: date.toLocaleString(),
    utc: date.toUTCString()
  };
}

export default function TimestampConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState(() => Math.floor(Date.now() / 1000).toString());

  let result: ReturnType<typeof formatDate> | null = null;
  let error = "";

  try {
    result = formatDate(parseTimestamp(input));
  } catch (parseError) {
    result = null;
    error = parseError instanceof Error ? parseError.message : "时间转换失败";
  }

  function setNow() {
    setInput(Date.now().toString());
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Time Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>输入</span>
          <input value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <button type="button" onClick={setNow}>
          当前时间
        </button>
      </div>
      {result ? (
        <div className="detail-grid">
          <article className="detail-card">
            <h3>Unix seconds</h3>
            <p>{result.unixSeconds}</p>
          </article>
          <article className="detail-card">
            <h3>Unix milliseconds</h3>
            <p>{result.unixMilliseconds}</p>
          </article>
          <article className="detail-card">
            <h3>ISO</h3>
            <p>{result.iso}</p>
          </article>
          <article className="detail-card">
            <h3>Local</h3>
            <p>{result.local}</p>
          </article>
          <article className="detail-card">
            <h3>UTC</h3>
            <p>{result.utc}</p>
          </article>
        </div>
      ) : null}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
