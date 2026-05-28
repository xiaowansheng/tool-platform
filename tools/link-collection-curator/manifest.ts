import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "link-collection-curator",
  name: "Link Collection Curator",
  description: "整理 URL 清单，自动校验链接、按标签分组，并导出 Markdown 或 JSON 资源目录。",
  category: "导航发现",
  subCategory: "directory",
  tags: ["links", "bookmark", "directory", "markdown", "curation"],
  icon: "list-tree",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["link-parse", "tag-grouping", "markdown-directory"]
};

export default manifest;
