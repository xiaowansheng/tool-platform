import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sql-playground",
  name: "SQL Playground",
  description: "浏览器内执行轻量 SQL 子集，保留后续 SQLite/WASM 运行时接入边界。",
  category: "数据工具",
  subCategory: "database",
  tags: ["sql", "sqlite", "playground", "wasm"],
  icon: "database-zap",
  runtime: "simple",
  featured: true
};

export default manifest;
