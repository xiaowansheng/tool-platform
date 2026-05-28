import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "markdown-linter",
  name: "Markdown Linter",
  description: "检查 Markdown 标题层级、空行、尾随空格、代码块语言和行宽问题。",
  category: "text-tools",
  subCategory: "markdown",
  tags: ["markdown", "lint", "docs", "quality"],
  icon: "list-checks",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
