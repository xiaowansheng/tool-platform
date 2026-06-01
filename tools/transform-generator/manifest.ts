import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "transform-generator",
  name: "CSS Transform Generator",
  description: "可视化编辑 translate、rotate、scale、skew 变换，生成 CSS transform 代码。",
  category: "design-tools",
  subCategory: "css",
  tags: ["transform", "css", "translate", "rotate", "scale", "skew", "visual"],
  icon: "move-3d",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
