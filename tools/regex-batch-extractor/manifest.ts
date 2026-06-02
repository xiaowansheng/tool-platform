import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "regex-batch-extractor",
  name: "Regex Batch Extractor",
  description: "使用正则表达式从批量文本中提取匹配项，支持捕获组、去重和多种输出格式。",
  category: "text-tools",
  subCategory: "extract",
  tags: ["regex", "extract", "batch", "pattern", "match", "capture-group"],
  icon: "regex",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
