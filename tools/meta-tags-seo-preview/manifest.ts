import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "meta-tags-seo-preview",
  name: "Meta Tags / SEO Preview",
  description: "检查 title、description、canonical、robots，并预览搜索结果、Open Graph 和 Twitter Card。",
  category: "seo-tools",
  subCategory: "seo",
  tags: ["meta tags", "seo", "serp", "open graph", "twitter card"],
  icon: "search-check",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
