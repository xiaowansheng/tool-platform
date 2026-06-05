import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "word-counter-pro",
  name: "Word Counter Pro",
  description: "字数统计、阅读时间估算、关键词频率分析与可读性评分。",
  category: "text-tools",
  tags: ["word-count", "reading-time", "frequency"],
  icon: "sigma",
  runtime: "simple",
  featured: false
};

export default manifest;
