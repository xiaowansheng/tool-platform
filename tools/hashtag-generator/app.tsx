"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const platformTags: Record<string, string[]> = {
  x: ["BuildInPublic", "DevTools", "Productivity"],
  instagram: ["CreatorTools", "Workflow", "Design"],
  linkedin: ["SoftwareEngineering", "ProductManagement", "TeamProductivity"],
  xiaohongshu: ["效率工具", "程序员", "工作流"]
};
function normalizeTag(value: string) { return value.replace(/^[#＃]+/, "").replace(/[^\p{L}\p{N}_-]/gu, "").trim(); }

export default function HashtagGeneratorTool({ manifest }: ToolAppProps) {
  const [content, setContent] = useState("分享一个工具平台优化过程：补齐模板页面、增加本地计算工具、提升构建验证覆盖。");
  const [platform, setPlatform] = useState("linkedin");
  const [custom, setCustom] = useState("tool-platform, frontend, devtools");
  const tags = useMemo(() => {
    const words = (content.match(/[\p{L}\p{N}]{2,}/gu) ?? []).map(normalizeTag).filter(Boolean).slice(0, 12);
    const extras = custom.split(/[,\n]/).map(normalizeTag).filter(Boolean);
    return [...new Set([...(platformTags[platform] ?? []), ...words, ...extras])].slice(0, 24).map((tag) => `#${tag}`);
  }, [content, custom, platform]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Social</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>平台</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="x">Twitter/X</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option><option value="xiaohongshu">小红书</option></select></label><label className="tool-field tool-field--compact"><span>自定义标签</span><input value={custom} onChange={(event) => setCustom(event.target.value)} /></label></div>
      <label className="tool-field"><span>内容描述</span><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} /></label>
      <div className="detail-card"><h3>推荐标签</h3><p className="mono-output">{tags.join(" ")}</p></div>
    </section>
  );
}
