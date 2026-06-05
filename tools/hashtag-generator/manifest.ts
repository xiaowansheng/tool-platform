import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "hashtag-generator",
  name: "Hashtag Generator",
  description: "基于内容描述智能推荐社交媒体标签，支持分类与热门标签。",
  category: "social-tools",
  tags: ["hashtag", "social-media", "content"],
  icon: "hash",
  runtime: "simple",
  featured: false
};

export default manifest;
