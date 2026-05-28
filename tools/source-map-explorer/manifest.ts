import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "source-map-explorer",
  name: "Source Map Explorer",
  description: "解析 Source Map，按源码查看映射分布，并把生成代码位置反查到原始源码。",
  category: "开发工具",
  subCategory: "bundles",
  tags: ["source-map", "bundle", "mappings", "javascript", "sourcemap"],
  icon: "map",
  runtime: "simple",
  featured: true,
  permissions: ["filesystem"]
};

export default manifest;
