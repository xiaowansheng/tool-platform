import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ascii-art",
  name: "ASCII 艺术字生成器",
  description: "将普通文本转换为精美的 ASCII 艺术字字幅，提供多种字体样式、对齐方式以及预设字符图形组合。",
  category: "text-tools",
  subCategory: "text-processing",
  tags: ["ascii-art", "text-banner", "designer", "geek"],
  icon: "type",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
