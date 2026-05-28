import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "mime-type-lookup",
  name: "MIME Type Lookup",
  description: "根据扩展名或 MIME 类型快速查询常见 Content-Type。",
  category: "导航发现",
  subCategory: "reference",
  tags: ["mime", "content-type", "file", "http"],
  icon: "file-type",
  runtime: "simple",
  featured: false
};

export default manifest;
