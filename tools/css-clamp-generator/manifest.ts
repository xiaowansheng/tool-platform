import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-clamp-generator",
  name: "CSS Clamp Generator",
  description: "生成响应式 CSS clamp() 表达式，用于字体、间距和布局尺寸。",
  category: "design",
  subCategory: "css",
  tags: ["css", "clamp", "responsive", "fluid"],
  icon: "ruler",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
