import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-grid-generator",
  name: "CSS Grid Generator",
  description: "可视化调整列、行、间距和 auto-fit，生成可复制的 CSS Grid 布局代码。",
  category: "design",
  subCategory: "css",
  tags: ["css", "grid", "layout", "visual"],
  icon: "layout-grid",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
