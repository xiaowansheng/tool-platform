import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "flexbox-generator",
  name: "Flexbox Generator",
  description: "可视化调试方向、换行、主轴和交叉轴对齐，生成 Flexbox CSS。",
  category: "设计工具",
  subCategory: "css",
  tags: ["css", "flexbox", "layout", "visual"],
  icon: "panel-top",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
