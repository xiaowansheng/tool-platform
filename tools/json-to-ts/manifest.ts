import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-to-ts",
  name: "JSON to TypeScript",
  description: "根据 JSON 示例生成 TypeScript interface 草稿。",
  category: "developer",
  subCategory: "typescript",
  tags: ["json", "typescript", "interface", "types"],
  icon: "braces",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
