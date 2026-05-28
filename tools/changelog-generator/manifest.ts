import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "changelog-generator",
  name: "Changelog 生成器",
  description: "从 Conventional Commit 文本生成 Keep a Changelog 风格的版本记录。",
  category: "office-tools",
  subCategory: "release",
  tags: ["changelog", "release", "conventional-commits", "markdown"],
  icon: "scroll-text",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
