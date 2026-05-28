import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "格式化、压缩并校验 JSON 文本，面向开发工作流。",
  category: "数据工具",
  subCategory: "data",
  tags: ["json", "formatter", "validator"],
  icon: "braces",
  runtime: "simple",
  featured: true
};

export default manifest;
