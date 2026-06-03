import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "social-character-counter",
  name: "社交媒体字符计数",
  description: "实时统计文本字符数，对照 Twitter/X、微博、Instagram、抖音 等平台的字数限制",
  category: "social-tools",
  subCategory: "content-creation",
  tags: ["social", "character", "counter", "twitter", "weibo", "text"],
  icon: "hash",
  runtime: "simple",
  featured: false
};

export default manifest;
