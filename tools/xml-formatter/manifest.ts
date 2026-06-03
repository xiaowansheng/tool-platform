import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "xml-formatter",
  name: "XML Formatter",
  description: "格式化、压缩和校验 XML 文档，支持缩进调整和语法高亮预览。",
  category: "data-tools",
  subCategory: "data",
  tags: ["xml", "formatter", "validator", "beautify", "minify"],
  icon: "file-code-2",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
