import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "documentation-toc-anchor-generator",
  name: "文档目录 / 锚点生成器",
  description: "从 Markdown 标题生成 GitHub 风格目录、锚点清单和带 TOC 标记的文档。",
  category: "text",
  subCategory: "markdown",
  tags: ["markdown", "toc", "anchor", "docs"],
  icon: "list-tree",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
