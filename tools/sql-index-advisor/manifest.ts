import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sql-index-advisor",
  name: "SQL Index Advisor",
  description: "从 SQL 查询中提取 WHERE、JOIN、ORDER BY 字段，生成索引候选、风险提示和可复制 DDL。",
  category: "data-tools",
  subCategory: "performance",
  tags: ["sql", "index", "database", "performance", "ddl"],
  icon: "database-zap",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["sql-analysis", "index-ddl", "query-tuning"]
};

export default manifest;
