import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sql-explain-visualizer",
  name: "SQL Explain Visualizer",
  description: "把 SQL 查询拆成扫描、过滤、聚合、排序等执行步骤。",
  category: "data-tools",
  subCategory: "database",
  tags: ["sql", "explain", "query-plan", "database"],
  icon: "workflow",
  runtime: "simple",
  featured: false
};

export default manifest;
