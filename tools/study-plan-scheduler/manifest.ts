import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "study-plan-scheduler",
  name: "Study Plan Scheduler",
  description: "根据主题、预计时长、优先级和每日可用时间生成学习排期与复习清单。",
  category: "learning-tools",
  subCategory: "planning",
  tags: ["study", "schedule", "learning", "revision", "plan"],
  icon: "calendar-days",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["topic-planning", "daily-capacity", "revision-checklist"]
};

export default manifest;
