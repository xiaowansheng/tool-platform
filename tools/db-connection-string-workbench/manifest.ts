import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "db-connection-string-workbench",
  name: "DB Connection String Workbench",
  description: "支持 PostgreSQL, MySQL, Redis, MongoDB, SQL Server, Oracle, ClickHouse 等 8 种连接串（DSN）的可视化表单生成与解析，支持安全脱敏、.env 导出与多语言连接代码片段生成。",
  category: "data-tools",
  subCategory: "connection",
  tags: ["database", "postgres", "mysql", "redis", "mongodb", "dsn"],
  icon: "database",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["dsn-parse", "secret-masking", "env-snippets"]
};

export default manifest;
