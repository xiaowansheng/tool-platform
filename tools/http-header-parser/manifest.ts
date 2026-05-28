import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "http-header-parser",
  name: "HTTP Header Parser",
  description: "解析原始 HTTP Header 文本，输出结构化键值和常见安全提示。",
  category: "站长工具",
  subCategory: "debugging",
  tags: ["http", "headers", "security", "debug"],
  icon: "rows-3",
  runtime: "simple",
  featured: false
};

export default manifest;
