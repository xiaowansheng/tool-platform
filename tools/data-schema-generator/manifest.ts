import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "data-schema-generator",
  name: "Data Schema Generator",
  description: "从示例数据推断 JSON Schema、TypeScript 类型与 Zod 结构。",
  category: "data-tools",
  tags: ["schema", "json-schema", "typescript", "inference"],
  icon: "drafting-compass",
  runtime: "simple",
  featured: false
};

export default manifest;
