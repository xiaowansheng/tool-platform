import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-chat",
  name: "AI Chat",
  description: "浏览器内 AI Chat 工作台，支持 system prompt、流式输出、会话记录和本地 token 估算。",
  category: "AI工具",
  subCategory: "chat",
  tags: ["ai", "chat", "prompt", "streaming", "local"],
  icon: "messages-square",
  runtime: "ai",
  featured: false,
  ai: true,
  permissions: ["clipboard"],
  capabilities: ["streaming-chat", "prompt-workbench", "local-simulation"]
};

export default manifest;
