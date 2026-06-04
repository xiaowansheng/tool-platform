import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "markdown-preview",
  name: "Markdown 预览器",
  description: "编辑 Markdown，并用安全的 React 渲染器预览常见语法。",
  category: "text-tools",
  tags: ["markdown", "preview", "editor", "viewer"],
  icon: "eye",
  runtime: "simple",
  featured: false
};

export default manifest;
