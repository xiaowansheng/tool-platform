import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-brief-synthesizer",
  name: "AI Brief Synthesizer",
  description: "将长文本提炼为结构化简报，支持摘要、要点提取和关键结论生成。",
  category: "ai-tools",
  subCategory: "text-generation",
  tags: ["ai", "summary", "brief", "synthesis", "extract", "key-points"],
  icon: "brain",
  runtime: "ai",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
