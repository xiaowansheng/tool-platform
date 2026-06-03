import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-cropper",
  name: "图片裁剪",
  description: "交互式裁剪图片，支持自由裁剪和常用比例预设（1:1、4:3、16:9 等）。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["crop", "裁剪", "resize", "aspect-ratio", "cut"],
  icon: "crop",
  runtime: "simple",
  featured: false
};

export default manifest;
