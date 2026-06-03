import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-stitcher",
  name: "图片拼接",
  description: "将多张图片横向或纵向拼接为一张长图，支持间距和背景色设置。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["stitch", "拼接", "merge", "combine", "长图"],
  icon: "layout-grid",
  runtime: "simple",
  featured: false
};

export default manifest;
