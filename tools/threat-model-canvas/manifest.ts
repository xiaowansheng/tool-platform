import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "threat-model-canvas",
  name: "Threat Model Canvas",
  description: "整理资产、入口、信任边界、STRIDE 威胁和缓解措施。",
  category: "security-tools",
  subCategory: "security",
  tags: ["threat-model", "stride", "security", "architecture", "canvas"],
  icon: "network",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
