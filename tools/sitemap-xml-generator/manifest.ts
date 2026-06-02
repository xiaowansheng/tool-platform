import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sitemap-xml-generator",
  name: "Sitemap XML Generator",
  description: "根据 URL 列表生成标准 sitemap.xml 文件，支持设置优先级、更新频率和最后修改时间。",
  category: "seo-tools",
  subCategory: "sitemap",
  tags: ["sitemap", "xml", "seo", "url", "crawler", "search-engine"],
  icon: "sitemap",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
