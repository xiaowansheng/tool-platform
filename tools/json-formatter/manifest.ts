import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "格式化、压缩并校验 JSON 文本，面向开发工作流。",
  category: "data-tools",
  subCategory: "data",
  tags: ["json", "formatter", "validator", "minify", "tree", "sort", "pretty-print"],
  icon: "braces",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
