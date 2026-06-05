import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-palette-extractor",
  name: "Color Palette Extractor",
  description: "从上传图片提取主色调与配色方案，输出 HEX/HSL/RGB。",
  category: "image-tools",
  tags: ["color", "palette", "extract", "image"],
  icon: "palette",
  runtime: "simple",
  featured: false
};

export default manifest;
