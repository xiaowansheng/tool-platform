import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "token-cost-calculator",
  name: "Token Cost Calculator",
  description: "按输入/输出 token、运行次数和可编辑单价估算 LLM 调用成本。",
  category: "ai",
  subCategory: "trusted-development",
  tags: ["tokens", "cost", "pricing", "budget", "llm"],
  icon: "calculator",
  runtime: "simple",
  featured: false
};

export default manifest;
