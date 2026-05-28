import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-clamp-generator",
  name: "Responsive Type Scale",
  description: "生成响应式 CSS clamp() 字体比例、设计 token 和标题/正文排版代码。",
  category: "design-tools",
  subCategory: "css",
  tags: ["css", "clamp", "responsive", "fluid", "typography"],
  icon: "ruler",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
