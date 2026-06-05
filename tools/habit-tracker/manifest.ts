import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "habit-tracker",
  name: "Habit Tracker",
  description: "习惯追踪器，记录每日打卡、连续天数与完成率统计。",
  category: "productivity-tools",
  tags: ["habit", "tracker", "streak", "productivity"],
  icon: "calendar-check",
  runtime: "simple",
  featured: false
};

export default manifest;
