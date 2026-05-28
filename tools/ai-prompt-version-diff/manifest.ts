import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-prompt-version-diff",
  name: "AI Prompt Version Diff",
  description: "对比新旧 Prompt，识别约束删除、能力面变化、token 漂移和需要补 eval 的风险。",
  category: "AI工具",
  subCategory: "trusted-development",
  tags: ["prompt", "version diff", "eval", "guardrails", "change review"],
  icon: "git-compare",
  runtime: "simple",
  featured: false
};

export default manifest;
