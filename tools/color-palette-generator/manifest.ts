import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-palette-generator",
  name: "Color Palette Generator",
  description: "基于一个 HEX 颜色生成浅色、深色和强调色阶。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "palette", "design", "hex"],
  icon: "swatch-book",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
