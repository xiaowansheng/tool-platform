import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "markdown-html-converter",
  name: "Markdown HTML 互转工具",
  description: "在 Markdown 格式和原生 HTML 代码之间进行双向互转。提供实时预览、格式化输出以及一键复制。",
  category: "text-tools",
  subCategory: "text-processing",
  tags: ["markdown", "html", "converter", "parser"],
  icon: "file-text",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
