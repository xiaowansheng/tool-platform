import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-compressor",
  name: "Image Compressor",
  description: "图片压缩与优化，调整质量/尺寸/格式，支持批量处理。",
  category: "image-tools",
  tags: ["image", "compress", "optimize", "webp"],
  icon: "image-down",
  runtime: "simple",
  featured: false
};

export default manifest;
