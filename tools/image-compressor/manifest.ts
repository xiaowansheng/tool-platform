import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-compressor",
  name: "Image Compressor",
  description: "在浏览器本地压缩图片，支持尺寸限制、JPEG/WebP/PNG 输出和压缩率预览。",
  category: "图片工具",
  subCategory: "optimize",
  tags: ["image", "compress", "jpeg", "webp", "png", "canvas"],
  icon: "image-down",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem"]
};

export default manifest;
