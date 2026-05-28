import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "meta-tags-seo-preview",
  name: "Meta Tags / SEO Preview",
  description: "检查 title、description、canonical、robots 和社交 meta 标签的搜索结果预览。",
  category: "seo-tools",
  subCategory: "seo",
  tags: ["meta tags", "seo", "serp", "open graph", "twitter card"],
  icon: "search-check",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
