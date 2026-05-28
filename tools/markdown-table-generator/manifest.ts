import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "markdown-table-generator",
  name: "Markdown Table Generator",
  description: "从 CSV 或制表符文本生成 Markdown 表格。",
  category: "text-tools",
  subCategory: "markdown",
  tags: ["markdown", "table", "csv", "docs"],
  icon: "table-2",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
