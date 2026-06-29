import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "meta-tags-seo-preview",
  name: "Meta Tags / SEO Preview",
  description: "一键拉取并解析在线网址的 SEO Meta 标签，支持直接生成搜索引擎和社交媒体卡片预览（SERP / Open Graph / Twitter Card），并可手动编辑导出 HTML 标签。",
  category: "seo-tools",
  subCategory: "seo",
  tags: ["meta tags", "seo", "serp", "open graph", "twitter card"],
  icon: "search-check",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["http-request"]
};

export default manifest;
