import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "llm-eval-case-generator",
  name: "LLM Eval Case Generator",
  description: "根据模型行为规格生成指令遵循、RAG、事实性、安全和工具使用 eval 用例。",
  category: "ai",
  subCategory: "trusted-development",
  tags: ["llm eval", "test cases", "rubric", "safety", "rag"],
  icon: "flask-conical",
  runtime: "simple",
  featured: false
};

export default manifest;
