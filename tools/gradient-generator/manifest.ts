import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "gradient-generator",
  name: "Gradient Theme Token Generator",
  description: "从渐变和品牌色生成 palette、语义色与 CSS theme tokens。",
  category: "design-tools",
  subCategory: "css",
  tags: ["gradient", "css", "design", "color", "palette", "theme tokens"],
  icon: "paintbrush",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
