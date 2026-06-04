import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-studio",
  name: "Image Studio",
  description: "一站式图片工坊，包含规格查看、EXIF元数据清理、自由裁剪、水印防盗、尺寸压缩、格式转换、九宫格切图与多图拼接。",
  category: "image-tools",
  subCategory: "optimize",
  tags: ["image", "compress", "crop", "format", "convert", "watermark", "split", "stitch", "exif", "metadata", "gif"],
  icon: "image",
  runtime: "simple",
  featured: true,
  permissions: ["filesystem"]
};

export default manifest;
