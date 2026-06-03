import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-trust-analyzer",
  name: "AI Trust Analyzer",
  description: "AI 代码风险扫描、Prompt 注入检测、事实核查、PR 风险分析、测试用例生成、Bug 复现、错误排查、Token 成本估算等 15 种分析工具。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["ai", "trust", "safety", "code risk", "prompt injection", "fact check", "pr risk", "test case", "bug", "stack trace", "token", "rag", "eval"],
  icon: "scan-search",
  runtime: "simple",
  featured: true
};

export default manifest;
