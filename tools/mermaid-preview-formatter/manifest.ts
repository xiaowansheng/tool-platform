import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "mermaid-preview-formatter",
  name: "Mermaid Preview / Formatter",
  description: "格式化 Mermaid 图表源码，并为常见 flowchart 语法生成轻量预览。",
  category: "office-tools",
  subCategory: "documentation",
  tags: ["mermaid", "diagram", "formatter", "docs"],
  icon: "workflow",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
