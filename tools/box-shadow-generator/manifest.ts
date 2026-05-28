import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "box-shadow-generator",
  name: "CSS Effects Studio",
  description: "组合 box-shadow、边框、圆角、backdrop-filter 和 text-shadow，生成可复制的 CSS 效果。",
  category: "design-tools",
  subCategory: "css",
  tags: ["box-shadow", "css", "design", "shadow", "filter", "effects"],
  icon: "layers",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
