"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const TABS = ["Compose", "Schedule"] as const;

const platformLimits: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  threads: 500,
  mastodon: 500
};

const bestTimes: Record<string, string> = {
  x: "Mon-Fri 9-11 AM",
  linkedin: "Tue-Thu 8-10 AM, 5-6 PM",
  instagram: "Mon-Fri 9-11 AM, 6-9 PM",
  facebook: "Weekdays 9-11 AM, 1-3 PM",
  threads: "Evening 6-9 PM",
  mastodon: "Mon-Fri 8-10 AM"
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

function extractTags(text: string) {
  const matches = text.match(/#[\w\u4e00-\u9fff]+/g);
  return matches ?? [];
}

function extractUrls(text: string) {
  const matches = text.match(/https?:\/\/[^\s]+/g);
  return matches ?? [];
}

function countEmojis(text: string) {
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const matches = text.match(emojiRegex);
  return matches?.length ?? 0;
}

export default function SocialPostSchedulerTool({ manifest }: ToolAppProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Compose");
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
  const extractedTags = useMemo(() => extractTags(fullCaption), [fullCaption]);
  const extractedUrls = useMemo(() => extractUrls(fullCaption), [fullCaption]);
  const emojiCount = useMemo(() => countEmojis(fullCaption), [fullCaption]);
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
          <p className="eyebrow">社交发布</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? "tool-toolbar__btn tool-toolbar__btn--active" : "tool-toolbar__btn"} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Compose" ? (
        <>
          <div className="workspace workspace--two-column">
            <div className="workspace workspace--stack">
              <label className="tool-field"><span>文案</span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
              <label className="tool-field"><span>标签</span><input value={hashtags} onChange={(event) => setHashtags(event.target.value)} /></label>
            </div>
            <div className="workspace workspace--stack">
              <div className="detail-grid">
                <article className="detail-card"><h3>总字符</h3><p>{fullCaption.length}</p></article>
                <article className="detail-card"><h3>Emoji</h3><p>{emojiCount}</p></article>
                <article className="detail-card"><h3>话题标签</h3><p>{extractedTags.length}</p></article>
                <article className="detail-card"><h3>链接</h3><p>{extractedUrls.length}</p></article>
              </div>
              <div className="detail-grid">
                {platformList.map((p) => (
                  <article key={p} className="detail-card">
                    <h3>{p}</h3>
                    <p className={fullCaption.length > (platformLimits[p] ?? 1000) ? "text-red" : ""}>
                      {fullCaption.length}/{platformLimits[p] ?? 1000}
                    </p>
                    {bestTimes[p] ? <p className="tool-note" style={{ fontSize: "0.75rem" }}>{bestTimes[p]}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
          <p className="tool-note">提词参考：常用强号召力动词包括 &quot;Discover&quot;、&quot;Learn&quot;、&quot;Try&quot;；避免过多缩略语。</p>
        </>
      ) : (
        <>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact"><span>开始日期</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="tool-field tool-field--compact"><span>时间</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            <label className="tool-field tool-field--compact"><span>间隔天数</span><input type="number" min="1" max="30" value={cadenceDays} onChange={(event) => setCadenceDays(Number(event.target.value))} /></label>
            <label className="tool-field tool-field--compact"><span>每平台条数</span><input type="number" min="1" max="20" value={postsPerPlatform} onChange={(event) => setPostsPerPlatform(Number(event.target.value))} /></label>
            <button type="button" onClick={() => void copy("csv", csv)}>{copied === "csv" ? "已复制" : "复制 CSV"}</button>
          </div>

          <div className="detail-grid">
            <article className="detail-card"><h3>字符数</h3><p>{fullCaption.length}</p></article>
            <article className="detail-card"><h3>平台数</h3><p>{platformList.length}</p></article>
            <article className="detail-card"><h3>帖子数</h3><p>{rows.length}</p></article>
            <article className="detail-card"><h3>警告</h3><p>{rows.filter((row) => row.status !== "ready").length}</p></article>
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
          <p className="tool-note">CSV 可导入表格或排期系统；平台上限是常用经验值，应以各平台当前发布规则为准。</p>
        </>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
