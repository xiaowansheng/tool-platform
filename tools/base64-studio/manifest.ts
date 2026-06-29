import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "base64-studio",
  name: "Base64 Studio",
  description: "支持文本与文件的 Base64 互相转换，一键生成 HTML/CSS 嵌入式 Data URL，以及解密图片直接预览和二进制文件下载。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["base64", "encoding", "file", "text", "dataurl", "image"],
  icon: "binary",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
