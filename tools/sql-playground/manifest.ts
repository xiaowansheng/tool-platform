import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sql-playground",
  name: "SQL Playground",
  description: "在浏览器 Worker 中运行真实 SQLite/WASM，支持初始化脚本、查询结果、Schema 和关系图联动查看。",
  category: "data-tools",
  subCategory: "database",
  tags: ["sql", "sqlite", "playground", "wasm"],
  icon: "database-zap",
  runtime: "wasm",
  featured: true
};

export default manifest;
