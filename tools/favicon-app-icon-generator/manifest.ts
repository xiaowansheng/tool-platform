import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "favicon-app-icon-generator",
  name: "Favicon / App Icon Generator",
  description: "用文字、颜色和形状生成 favicon、Apple Touch Icon 与 PWA 图标素材。",
  category: "design",
  subCategory: "asset",
  tags: ["favicon", "app icon", "pwa", "icon", "svg", "png"],
  icon: "badge",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
