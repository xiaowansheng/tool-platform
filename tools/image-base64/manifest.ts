import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-base64",
  name: "图片 Base64 编码",
  description: "将图片文件转为 Base64 Data URL，或将 Base64 字符串还原为图片并下载。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["base64", "image", "data-url", "encoding", "编码"],
  icon: "binary",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
