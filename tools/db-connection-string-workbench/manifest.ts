import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "db-connection-string-workbench",
  name: "DB Connection String Workbench",
  description: "解析和重建 PostgreSQL、MySQL、Redis 连接串，输出脱敏摘要、环境变量和客户端命令。",
  category: "数据工具",
  subCategory: "connection",
  tags: ["database", "postgres", "mysql", "redis", "url", "dsn"],
  icon: "database",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["dsn-parse", "secret-masking", "env-snippets"]
};

export default manifest;
