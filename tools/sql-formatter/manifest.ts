import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sql-formatter",
  name: "SQL Formatter",
  description: "对常见 SQL 关键字换行缩进，便于快速阅读查询语句。",
  category: "数据工具",
  subCategory: "database",
  tags: ["sql", "formatter", "database", "query"],
  icon: "database",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
