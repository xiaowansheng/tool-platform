import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "robots-txt-generator",
  name: "Robots.txt Generator",
  description: "生成常用 robots.txt 规则，包含 sitemap、allow 和 disallow。",
  category: "seo-tools",
  subCategory: "seo",
  tags: ["robots", "seo", "crawler", "sitemap"],
  icon: "bot",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
