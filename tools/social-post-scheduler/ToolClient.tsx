"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const platformLimits: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  threads: 500,
  mastodon: 500
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function parseList(value: string) {
  return value.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export default function SocialPostSchedulerTool({ manifest }: ToolClientProps) {
  const [caption, setCaption] = useState("Ship note: we added a compact tool workspace with faster search, cleaner categories, and better runtime metadata.");
  const [hashtags, setHashtags] = useState("#buildinpublic #devtools");
  const [platforms, setPlatforms] = useState("x, linkedin, instagram");
  const [startDate, setStartDate] = useState(today);
  const [time, setTime] = useState("09:30");
  const [cadenceDays, setCadenceDays] = useState(2);
  const [postsPerPlatform, setPostsPerPlatform] = useState(3);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const platformList = useMemo(() => parseList(platforms).map((item) => item.toLowerCase()), [platforms]);
  const fullCaption = `${caption.trim()} ${hashtags.trim()}`.trim();
  const rows = useMemo(() => {
    const output: Array<{ date: string; time: string; platform: string; caption: string; status: string }> = [];

    for (let index = 0; index < postsPerPlatform; index += 1) {
      for (const platform of platformList) {
        const limit = platformLimits[platform] ?? 1000;
        output.push({
          date: addDays(startDate, index * cadenceDays),
          time,
          platform,
          caption: fullCaption,
          status: fullCaption.length > limit ? `over ${limit}` : "ready"
        });
      }
    }

    return output;
  }, [cadenceDays, fullCaption, platformList, postsPerPlatform, startDate, time]);
  const csv = ["date,time,platform,caption,status", ...rows.map((row) => [row.date, row.time, row.platform, row.caption, row.status].map(csvCell).join(","))].join("\n");
  const markdown = rows.map((row) => `- ${row.date} ${row.time} [${row.platform}] ${row.status}`).join("\n");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Social</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>开始日期</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>时间</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <label className="tool-field tool-field--compact"><span>间隔天数</span><input type="number" min="1" max="30" value={cadenceDays} onChange={(event) => setCadenceDays(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>每平台条数</span><input type="number" min="1" max="20" value={postsPerPlatform} onChange={(event) => setPostsPerPlatform(Number(event.target.value))} /></label>
        <button type="button" onClick={() => void copy("csv", csv)}>{copied === "csv" ? "已复制" : "复制 CSV"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>Characters</h3><p>{fullCaption.length}</p></article>
        <article className="detail-card"><h3>Platforms</h3><p>{platformList.length}</p></article>
        <article className="detail-card"><h3>Posts</h3><p>{rows.length}</p></article>
        <article className="detail-card"><h3>Warnings</h3><p>{rows.filter((row) => row.status !== "ready").length}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>文案</span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
          <label className="tool-field"><span>平台，逗号或换行分隔</span><textarea value={platforms} onChange={(event) => setPlatforms(event.target.value)} /></label>
          <label className="tool-field"><span>标签</span><input value={hashtags} onChange={(event) => setHashtags(event.target.value)} /></label>
        </div>
        <label className="tool-field">
          <span>发布排期</span>
          <textarea value={`${markdown}\n\n${csv}`} readOnly spellCheck={false} />
        </label>
      </div>

      {rows.some((row) => row.status !== "ready") ? <p className="tool-error">部分平台超过建议字符上限，请缩短文案或单独改写。</p> : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">CSV 可导入表格或排期系统；平台上限是常用经验值，应以各平台当前发布规则为准。</p>
    </section>
  );
}
