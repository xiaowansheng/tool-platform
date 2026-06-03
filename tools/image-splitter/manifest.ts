import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-splitter",
  name: "图片九宫格切图工具",
  description: "将一张大图等分成 2x2、3x3（九宫格）、4x4 等多宫格切片，常用于社交网络（微信朋友圈、微博、小红书、Instagram）的拼图排版排布。完全本地化运行，零上传隐私保护。",
  category: "image-tools",
  tags: ["image", "splitter", "grid", "crop", "slice", "social-media"],
  icon: "grid",
  runtime: "simple",
  featured: true,
  permissions: []
};

export default manifest;
