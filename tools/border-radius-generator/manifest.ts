import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "border-radius-generator",
  name: "Border Radius Generator",
  description: "可视化编辑 border-radius，支持统一圆角与各角独立控制，生成 CSS。",
  category: "design-tools",
  subCategory: "css",
  tags: ["border-radius", "css", "design", "visual", "rounded"],
  icon: "square-dashed",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
