import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-named-colors",
  name: "CSS Named Colors",
  description: "搜索、浏览并复制所有 148 个 CSS 命名颜色。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "css", "named", "reference", "design"],
  icon: "swatch-book",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
