import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "curl-builder",
  name: "cURL Builder",
  description: "根据 URL、方法、Header 和 Body 生成可复制的 cURL 命令。",
  category: "developer",
  subCategory: "api",
  tags: ["curl", "api", "http", "request"],
  icon: "terminal",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
