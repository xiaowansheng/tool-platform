import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "access-log-parser",
  name: "Access Log Parser",
  description: "解析 Nginx 和 Apache combined/common access log，汇总状态码、路径、IP 与延迟。",
  category: "ops",
  subCategory: "logs",
  tags: ["nginx", "apache", "access-log", "http"],
  icon: "server",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard", "filesystem"]
};

export default manifest;
