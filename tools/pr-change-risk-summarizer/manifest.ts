import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pr-change-risk-summarizer",
  name: "PR Change Risk Summarizer",
  description: "解析 PR 描述或 diff，按鉴权、迁移、依赖、部署和大变更面生成风险摘要。",
  category: "developer-tools",
  subCategory: "trusted-development",
  tags: ["pull request", "diff", "risk summary", "review", "change management"],
  icon: "git-pull-request-arrow",
  runtime: "simple",
  featured: false
};

export default manifest;
