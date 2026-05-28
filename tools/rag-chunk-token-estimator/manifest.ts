import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "rag-chunk-token-estimator",
  name: "RAG Chunk Preview / Token Estimator",
  description: "预览 RAG 文档 chunk，估算 token、重叠比例和超大段落风险。",
  category: "AI工具",
  subCategory: "trusted-development",
  tags: ["rag", "chunking", "token estimate", "retrieval", "context"],
  icon: "text-select",
  runtime: "simple",
  featured: false
};

export default manifest;
