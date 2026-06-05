import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "api-route-designer",
  name: "API Route Designer",
  description: "可视化设计 REST/gRPC API 路由结构，生成 OpenAPI 规范片段。",
  category: "developer-tools",
  tags: ["api", "rest", "routing", "design"],
  icon: "route",
  runtime: "simple",
  featured: false
};

export default manifest;
