import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "case-converter",
  name: "Case Converter",
  description: "在 camelCase、snake_case、kebab-case、Title Case 等命名风格之间转换。",
  category: "text-tools",
  subCategory: "transform",
  tags: ["case", "string", "text", "naming"],
  icon: "case-sensitive",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
