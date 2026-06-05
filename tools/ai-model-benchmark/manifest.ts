import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-model-benchmark",
  name: "AI Model Benchmark",
  description: "多模型输出对比：同一 Prompt 在不同 AI 模型下的响应并列展示。",
  category: "ai-tools",
  tags: ["ai", "benchmark", "model", "comparison"],
  icon: "gauge",
  runtime: "simple",
  featured: false
};

export default manifest;
