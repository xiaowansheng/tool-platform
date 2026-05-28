import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "conventional-commit-helper",
  name: "Conventional Commit Helper",
  description: "组合 type、scope、subject、body 和 footer，生成规范提交信息并检查常见问题。",
  category: "开发工具",
  subCategory: "git",
  tags: ["git", "commit", "conventional-commits", "release"],
  icon: "git-commit-horizontal",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
