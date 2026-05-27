import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "text-inspector",
  name: "Text Inspector",
  description: "在 Worker 中分析大文本，并把报告缓存到 OPFS。",
  category: "text",
  subCategory: "analysis",
  tags: ["worker", "opfs", "text", "analysis"],
  icon: "file-search",
  runtime: "worker",
  featured: true,
  worker: true,
  permissions: ["filesystem", "clipboard"],
  capabilities: ["analysis", "cache", "stream"],
  memoryLimit: 256
};

export default manifest;
