import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "har-viewer",
  name: "HAR Viewer",
  description: "查看 HAR 请求列表、慢请求、域名分布、状态码和传输体积。",
  category: "webmaster-tools",
  subCategory: "debugging",
  tags: ["har", "network", "http", "performance"],
  icon: "activity",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard", "filesystem"]
};

export default manifest;
