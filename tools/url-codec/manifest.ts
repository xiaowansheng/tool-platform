import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "url-codec",
  name: "URL Codec",
  description: "编码、解码 URL 片段并解析查询参数。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["url", "encode", "decode", "query"],
  icon: "link",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
