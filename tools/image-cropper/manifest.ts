import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-cropper",
  name: "Image Cropper",
  description: "可视化图片裁剪，支持自由裁剪与预设尺寸比例。",
  category: "image-tools",
  tags: ["image", "crop", "resize", "aspect-ratio"],
  icon: "crop",
  runtime: "simple",
  featured: false
};

export default manifest;
