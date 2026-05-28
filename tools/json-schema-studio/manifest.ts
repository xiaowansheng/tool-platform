import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-schema-studio",
  name: "JSON Schema Studio",
  description: "从 JSON 示例生成 Schema，并在本地校验 JSON 数据。",
  category: "data-tools",
  subCategory: "schema",
  tags: ["json", "schema", "validator", "generator"],
  icon: "badge-check",
  runtime: "simple",
  featured: true
};

export default manifest;
