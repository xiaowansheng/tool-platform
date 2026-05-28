import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "gitignore-generator",
  name: "Gitignore Generator",
  description: "组合常见技术栈模板，快速生成 .gitignore。",
  category: "开发工具",
  subCategory: "git",
  tags: ["git", "gitignore", "template", "dev"],
  icon: "git-branch",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
