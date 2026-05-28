import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "box-shadow-generator",
  name: "Box Shadow Generator",
  description: "调节偏移、模糊、扩散和颜色，生成 box-shadow CSS。",
  category: "design",
  subCategory: "css",
  tags: ["box-shadow", "css", "design", "shadow"],
  icon: "layers",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
