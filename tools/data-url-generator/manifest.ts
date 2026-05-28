import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "data-url-generator",
  name: "Data URL Generator",
  description: "把文本内容编码为 data: URL，适合生成小型内联资源。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["data-url", "base64", "encoding", "inline"],
  icon: "file-code",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
