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
    local: date.toLocaleString("zh-CN", { hour12: false }),
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

  function setNowSeconds() {
    setInput(Math.floor(Date.now() / 1000).toString());
  }

  function setNowMilliseconds() {
    setInput(Date.now().toString());
  }

  function setIsoExample() {
    setInput("2026-05-31T12:00:00Z");
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">时间换算</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>时间戳或日期时间</span>
          <input value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <button type="button" onClick={setNowSeconds}>
          当前秒级
        </button>
        <button type="button" onClick={setNowMilliseconds}>
          当前毫秒级
        </button>
        <button type="button" onClick={setIsoExample}>
          ISO 示例
        </button>
      </div>
      {result ? (
        <div className="detail-grid">
          <article className="detail-card">
            <h3>Unix 秒</h3>
            <p>{result.unixSeconds}</p>
          </article>
          <article className="detail-card">
            <h3>Unix 毫秒</h3>
            <p>{result.unixMilliseconds}</p>
          </article>
          <article className="detail-card">
            <h3>ISO 时间</h3>
            <p>{result.iso}</p>
          </article>
          <article className="detail-card">
            <h3>本地时间</h3>
            <p>{result.local}</p>
          </article>
          <article className="detail-card">
            <h3>UTC 时间</h3>
            <p>{result.utc}</p>
          </article>
        </div>
      ) : null}
      <p className="tool-note">10 位数字按秒级 Unix 时间戳解析，13 位数字按毫秒级时间戳解析；排查日志时请同时核对 UTC 和本地时间。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
