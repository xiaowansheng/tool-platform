"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface PlatformLimit {
  name: string;
  limit: number;
  note: string;
}

const platforms: PlatformLimit[] = [
  { name: "Twitter/X", limit: 280, note: "英文 280 字符，CJK 按 2 字符计" },
  { name: "微博", limit: 2000, note: "普通用户 2000 字" },
  { name: "Instagram", limit: 2200, note: "Caption 上限" },
  { name: "抖音", limit: 300, note: "视频描述" },
  { name: "小红书", limit: 1000, note: "笔记正文" },
  { name: "LinkedIn", limit: 3000, note: "帖子上限" },
  { name: "Facebook", limit: 63206, note: "帖子上限（理论值）" },
  { name: "YouTube", limit: 5000, note: "视频描述" }
];

function countCjkAware(text: string): number {
  // Twitter-style: CJK characters count as 2, others as 1
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x3000 && code <= 0x9FFF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE4F) ||
      (code >= 0x20000 && code <= 0x2FA1F)
    ) {
      count += 2;
    } else {
      count += 1;
    }
  }
  return count;
}

export default function SocialCharacterCounter({ manifest }: ToolAppProps) {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const chars = text.length;
    const cjkWeighted = countCjkAware(text);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split("\n").length : 0;
    const sentences = text.trim() ? (text.match(/[.!?。！？]+/g) ?? []).length || (text.trim().length > 0 ? 1 : 0) : 0;
    const urls = (text.match(/https?:\/\/[^\s]+/g) ?? []).length;

    return { chars, cjkWeighted, words, lines, sentences, urls };
  }, [text]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">社交媒体</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在此输入或粘贴文本..."
        rows={6}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          resize: "vertical",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "inherit"
        }}
      />

      <div className="detail-grid">
        <article className="detail-card">
          <h3>字符数</h3>
          <p>{stats.chars}</p>
        </article>
        <article className="detail-card">
          <h3>CJK 加权</h3>
          <p>{stats.cjkWeighted}</p>
        </article>
        <article className="detail-card">
          <h3>词数</h3>
          <p>{stats.words}</p>
        </article>
        <article className="detail-card">
          <h3>行数</h3>
          <p>{stats.lines}</p>
        </article>
        <article className="detail-card">
          <h3>句子数</h3>
          <p>{stats.sentences}</p>
        </article>
        <article className="detail-card">
          <h3>URL 数</h3>
          <p>{stats.urls}</p>
        </article>
      </div>

      {/* Platform comparison */}
      <h3 style={{ margin: "20px 0 12px" }}>平台适配对照</h3>
      <div className="detail-grid">
        {platforms.map((p) => {
          const used = p.name === "Twitter/X" ? stats.cjkWeighted : stats.chars;
          const pct = Math.min((used / p.limit) * 100, 100);
          const over = used > p.limit;
          return (
            <article key={p.name} className="detail-card">
              <h3>{p.name}</h3>
              <p style={{ fontSize: 20, fontWeight: 700, color: over ? "#ef4444" : pct > 80 ? "#eab308" : "#22c55e" }}>
                {used} / {p.limit}
              </p>
              <div style={{
                width: "100%",
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.1)",
                marginTop: 6,
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: over ? "#ef4444" : pct > 80 ? "#eab308" : "#22c55e",
                  borderRadius: 2,
                  transition: "width 0.2s"
                }} />
              </div>
              <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{p.note}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
