import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "markdown-preview",
  name: "Markdown Preview",
  description: "在浏览器中编辑 Markdown，并用安全的 React 渲染器预览常见语法。",
  category: "文本工具",
  subCategory: "markdown",
  tags: ["markdown", "preview", "editor", "docs"],
  icon: "file-text",
  runtime: "simple",
  featured: false
};

export default manifest;
