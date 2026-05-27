import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "http-status-reference",
  name: "HTTP Status Reference",
  description: "快速查询常见 HTTP 状态码含义和使用场景。",
  category: "network",
  subCategory: "reference",
  tags: ["http", "status", "api", "reference"],
  icon: "server",
  runtime: "simple",
  featured: false
};

export default manifest;
