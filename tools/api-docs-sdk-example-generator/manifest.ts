import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "api-docs-sdk-example-generator",
  name: "API Docs to SDK Example Generator",
  description: "从 API 文档或 OpenAPI 片段提取 endpoint，并生成 TypeScript、Python 或 cURL SDK 示例。",
  category: "学习工具",
  subCategory: "trusted-development",
  tags: ["api docs", "sdk", "openapi", "examples", "developer experience"],
  icon: "braces",
  runtime: "simple",
  featured: false
};

export default manifest;
