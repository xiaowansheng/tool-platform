import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csv-markdown-table",
  name: "CSV ↔ Markdown Table",
  description: "CSV 与 Markdown 表格互转，支持自定义分隔符和对齐方式。",
  category: "data-tools",
  tags: ["csv", "markdown", "table", "convert"],
  icon: "table",
  runtime: "simple",
  featured: false
};

export default manifest;
