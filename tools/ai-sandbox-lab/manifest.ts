import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-sandbox-lab",
  name: "AI Sandbox Lab",
  description: "流式生成 AI 响应，并在隔离 iframe 中预览结果。",
  category: "AI工具",
  subCategory: "runtime",
  tags: ["ai", "stream", "sandbox", "iframe"],
  icon: "bot",
  runtime: "ai",
  featured: true,
  sandbox: true,
  ai: true,
  isolation: "iframe",
  permissions: ["clipboard"],
  capabilities: ["chat", "stream", "embedding", "sandbox"]
};

export default manifest;
