import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "unicode-inspector",
  name: "Unicode Inspector",
  description: "查看字符、码点、十六进制表示和 UTF-8 字节。",
  category: "text",
  subCategory: "analysis",
  tags: ["unicode", "utf8", "codepoint", "text"],
  icon: "pilcrow",
  runtime: "simple",
  featured: false
};

export default manifest;
