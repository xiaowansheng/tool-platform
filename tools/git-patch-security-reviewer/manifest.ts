import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "git-patch-security-reviewer",
  name: "Git Patch Security Reviewer",
  description: "扫描 Git diff 中新增的密钥、危险 API、弱加密、认证绕过和注入风险。",
  category: "developer",
  subCategory: "security",
  tags: ["git", "patch", "diff", "review", "security"],
  icon: "git-pull-request-arrow",
  runtime: "simple",
  featured: true
};

export default manifest;
