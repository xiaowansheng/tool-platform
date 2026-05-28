import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "basic-auth-generator",
  name: "Basic Auth Generator",
  description: "生成 HTTP Basic Authorization header，所有处理都在本地完成。",
  category: "developer",
  subCategory: "security",
  tags: ["basic-auth", "http", "authorization", "header"],
  icon: "key",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
