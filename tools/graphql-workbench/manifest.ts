import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "graphql-workbench",
  name: "GraphQL Workbench",
  description: "查看 GraphQL SDL 类型，并根据字段快速构造查询草稿。",
  category: "开发工具",
  subCategory: "api",
  tags: ["graphql", "schema", "query", "sdl"],
  icon: "network",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
