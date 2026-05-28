import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "prompt-injection-detector",
  name: "Prompt Injection Detector",
  description: "检测覆盖系统指令、泄露隐藏提示词、工具滥用和编码载荷等 Prompt Injection 信号。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["prompt injection", "llm security", "jailbreak", "rag", "guardrails"],
  icon: "scan-search",
  runtime: "simple",
  featured: true
};

export default manifest;
