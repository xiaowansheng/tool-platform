import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "jsonpath-tester",
  name: "JSONPath Tester",
  description: "在沙箱中执行 JSONPath 表达式，高亮匹配结果并显示查询统计。",
  category: "data-tools",
  tags: ["jsonpath", "json", "query", "sandbox"],
  icon: "list-filter",
  runtime: "sandbox",
  featured: false,
  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "jsonpath"],
  permissions: ["clipboard"]
};

export default manifest;
