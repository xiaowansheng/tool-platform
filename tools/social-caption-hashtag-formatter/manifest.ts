import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "social-caption-hashtag-formatter",
  name: "Social Caption Hashtag Formatter",
  description: "为社媒文案整理平台长度、换行、CTA、话题标签和 UTM 链接，生成多平台发布版本。",
  category: "社媒工具",
  subCategory: "publishing",
  tags: ["social", "caption", "hashtag", "cta", "utm"],
  icon: "share-2",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["caption-format", "hashtag-cleanup", "platform-limits"]
};

export default manifest;
