import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "api-error-code-doc-generator",
  name: "API Error Code 文档生成器",
  description: "把错误码清单转换为 Markdown 文档、响应结构和排查建议表。",
  category: "office-tools",
  subCategory: "api",
  tags: ["api", "error-code", "documentation", "markdown"],
  icon: "file-warning",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
