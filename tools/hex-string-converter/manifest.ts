import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "hex-string-converter",
  name: "Hex 字符串互转",
  description: "在十六进制编码和 UTF-8 字符串之间双向转换，支持常见分隔符格式。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["hex", "string", "converter", "十六进制", "编码"],
  icon: "arrow-left-right",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
