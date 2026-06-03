import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ulid-generator",
  name: "ULID Generator",
  description: "生成通用唯一字典序可排序标识符（ULID），兼容 UUID 且支持按时间排序。",
  category: "developer-tools",
  subCategory: "identifiers",
  tags: ["ulid", "uuid", "id", "sortable", "timestamp"],
  icon: "fingerprint",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
