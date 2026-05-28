import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "git-bisect-planner",
  name: "Git Bisect Planner",
  description: "根据 good/bad ref、测试命令和路径范围生成 git bisect 脚本、检查清单和复盘模板。",
  category: "开发工具",
  subCategory: "debugging",
  tags: ["git", "bisect", "debugging", "regression", "script"],
  icon: "git-branch",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["bisect-script", "regression-checklist", "debug-plan"]
};

export default manifest;
