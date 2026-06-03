import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-spec-viewer",
  name: "图片规格查看",
  description: "上传图片查看尺寸、宽高比、文件大小、DPI 信息和像素总数，支持缩放计算。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["image", "spec", "dimensions", "resolution", "dpi", "尺寸"],
  icon: "ruler",
  runtime: "simple",
  featured: false
};

export default manifest;
