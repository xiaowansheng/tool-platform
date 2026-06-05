import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "prompt-template-builder",
  name: "Prompt Template Builder",
  description: "AI Prompt 模板管理，支持变量注入、版本对比与输出预览。",
  category: "ai-tools",
  tags: ["prompt", "template", "ai", "llm"],
  icon: "message-square-plus",
  runtime: "simple",
  featured: false
};

export default manifest;
