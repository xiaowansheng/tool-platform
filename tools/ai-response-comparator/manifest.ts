import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-response-comparator",
  name: "AI Response Comparator",
  description: "并排对比多个 AI 响应结果，高亮差异并评分质量。",
  category: "ai-tools",
  tags: ["ai", "comparison", "response", "diff"],
  icon: "columns",
  runtime: "simple",
  featured: false
};

export default manifest;
