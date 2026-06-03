import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-extractor",
  name: "Color Extractor",
  description: "从图片中提取主色和配色方案，支持识别颜色占比和色值复制。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "extract", "palette", "image", "design", "hex"],
  icon: "eye",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem", "clipboard"]
};

export default manifest;
