import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "text-replacer",
  name: "Text Replacer",
  description: "批量查找替换文本，支持正则表达式、大小写转换与变量注入。",
  category: "text-tools",
  tags: ["replace", "batch", "regex", "find"],
  icon: "find-replace",
  runtime: "simple",
  featured: false
};

export default manifest;
