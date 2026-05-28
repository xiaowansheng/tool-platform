import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "llm-fact-check-checklist-generator",
  name: "LLM Fact-check Checklist Generator",
  description: "从 LLM 输出中抽取可核查断言，并生成来源、日期、范围和置信度检查清单。",
  category: "ai",
  subCategory: "trusted-development",
  tags: ["fact check", "llm output", "claims", "verification", "checklist"],
  icon: "list-checks",
  runtime: "simple",
  featured: false
};

export default manifest;
