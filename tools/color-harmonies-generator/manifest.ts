import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-harmonies-generator",
  name: "Color Harmonies Generator",
  description: "基于一种颜色自动生成互补、邻近、三角、四方等配色方案。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "harmony", "palette", "design", "hex", "scheme"],
  icon: "diamond-percent",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
