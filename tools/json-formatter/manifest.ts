import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-formatter",
  name: "JSON Formatter & Validator",
  description: "JSON 格式化、压缩与树状可视化查看，支持非标/宽松 JSON 与 JS 对象的智能检测及一键自动修复校正。",
  category: "data-tools",
  subCategory: "data",
  tags: ["json", "formatter", "validator", "minify", "tree", "sort", "repair"],
  icon: "braces",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
