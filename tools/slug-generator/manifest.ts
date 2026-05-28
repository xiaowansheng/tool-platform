import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "slug-generator",
  name: "Slug Generator",
  description: "把标题、文件名或标签转换为 URL 友好的 slug。",
  category: "seo-tools",
  subCategory: "seo",
  tags: ["slug", "seo", "url", "text"],
  icon: "link-2",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
