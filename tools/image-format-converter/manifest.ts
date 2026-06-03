import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-format-converter",
  name: "图片格式转换",
  description: "在 PNG、JPEG、WebP 和 BMP 之间转换图片格式，支持调整质量和尺寸。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["image", "format", "converter", "png", "jpeg", "webp", "bmp"],
  icon: "image-play",
  runtime: "simple",
  featured: false
};

export default manifest;
