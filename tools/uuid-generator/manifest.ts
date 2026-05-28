import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "uuid-generator",
  name: "UUID Generator",
  description: "批量生成 UUID v4，并支持快速复制。",
  category: "developer-tools",
  subCategory: "identifiers",
  tags: ["uuid", "id", "random"],
  icon: "fingerprint",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
