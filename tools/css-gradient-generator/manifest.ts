import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-gradient-generator",
  name: "CSS 渐变生成器",
  description: "可视化创建线性、径向、锥形渐变，实时预览并生成 CSS 代码",
  category: "design-tools",
  subCategory: "css",
  tags: ["css", "gradient", "linear", "radial", "conic", "design"],
  icon: "palette",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
