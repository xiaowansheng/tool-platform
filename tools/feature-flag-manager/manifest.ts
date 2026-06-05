import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "feature-flag-manager",
  name: "Feature Flag Manager",
  description: "特性开关配置生成与策略模拟，支持多环境对比。",
  category: "developer-tools",
  tags: ["feature-flag", "toggle", "config"],
  icon: "toggle-left",
  runtime: "simple",
  featured: false
};

export default manifest;
