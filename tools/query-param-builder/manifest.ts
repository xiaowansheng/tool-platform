import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "query-param-builder",
  name: "Query Param Builder",
  description: "解析、编辑并重建 URL 查询参数。",
  category: "network",
  subCategory: "url",
  tags: ["query", "url", "params", "builder"],
  icon: "list-plus",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
