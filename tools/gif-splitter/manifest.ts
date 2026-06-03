import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "gif-splitter",
  name: "GIF 分帧提取",
  description: "将 GIF 动图拆解为单帧 PNG 图片，查看帧数、帧率和每帧延迟。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["gif", "frames", "split", "animation", "动图"],
  icon: "film",
  runtime: "simple",
  featured: false
};

export default manifest;
