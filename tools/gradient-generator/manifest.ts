import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "gradient-generator",
  name: "Gradient Generator",
  description: "生成线性渐变 CSS，并提供即时预览。",
  category: "design",
  subCategory: "css",
  tags: ["gradient", "css", "design", "color"],
  icon: "paintbrush",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
