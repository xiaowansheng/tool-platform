import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "token-counter",
  name: "Token Counter",
  description: "多模型 Token 计数与费用估算，支持 GPT/Claude/Gemini 分词模拟。",
  category: "ai-tools",
  tags: ["token", "counter", "claude", "gpt", "gemini"],
  icon: "calculator",
  runtime: "simple",
  featured: false
};

export default manifest;
