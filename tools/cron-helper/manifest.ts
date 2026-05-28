import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "cron-helper",
  name: "Cron Helper",
  description: "解析 5 段 Cron 表达式，解释字段并预估后续运行时间。",
  category: "ops-tools",
  subCategory: "scheduler",
  tags: ["cron", "schedule", "ops", "time"],
  icon: "calendar-clock",
  runtime: "simple",
  featured: false
};

export default manifest;
