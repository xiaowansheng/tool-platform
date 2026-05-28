import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "env-parser",
  name: "ENV Parser",
  description: "解析 .env 文本，生成 JSON、shell export 或示例模板。",
  category: "开发工具",
  subCategory: "config",
  tags: ["env", "dotenv", "config", "json"],
  icon: "file-key",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
