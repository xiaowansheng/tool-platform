import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "line-tools",
  name: "Line Tools",
  description: "对多行文本进行排序、去重、去空行、修剪和反转。",
  category: "文本工具",
  subCategory: "transform",
  tags: ["lines", "sort", "unique", "text"],
  icon: "list-filter",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
