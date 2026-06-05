import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "screen-tester",
  name: "屏幕检测",
  description: "检测屏幕坏点、色彩均匀性和渐变带，支持纯色、渐变和网格测试图。",
  category: "ops-tools",
  subCategory: "hardware",
  tags: ["screen", "display", "dead-pixel", "color", "hardware", "monitor"],
  icon: "monitor",
  runtime: "simple",
  featured: false,
  capabilities: [],
  permissions: []
};

export default manifest;
