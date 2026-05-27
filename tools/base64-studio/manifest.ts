import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "base64-studio",
  name: "Base64 Studio",
  description: "在文本工作流里完成 Base64 编码与解码。",
  category: "text",
  subCategory: "encoding",
  tags: ["base64", "encoding", "text"],
  icon: "binary",
  runtime: "simple",
  featured: false
};

export default manifest;
