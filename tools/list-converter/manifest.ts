import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "list-converter",
  name: "List Converter",
  description: "处理列数据：支持转置、添加前缀/后缀、排序、去重、反序、截断和格式化输出。",
  category: "data-tools",
  subCategory: "data-processing",
  tags: ["list", "column", "transpose", "sort", "deduplicate", "prefix", "suffix"],
  icon: "list",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
