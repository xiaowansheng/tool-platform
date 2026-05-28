import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pomodoro-focus-timer",
  name: "Pomodoro Focus Timer",
  description: "配置番茄钟、短休息和长休息节奏，记录完成轮次并生成可复制的专注计划。",
  category: "productivity-tools",
  subCategory: "focus",
  tags: ["pomodoro", "timer", "focus", "productivity", "notification"],
  icon: "timer",
  runtime: "realtime",
  featured: false,
  permissions: ["notification", "clipboard"],
  capabilities: ["focus-cycle", "session-log", "notification-reminder"]
};

export default manifest;
