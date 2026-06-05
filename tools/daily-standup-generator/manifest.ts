import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "daily-standup-generator",
  name: "Daily Standup Generator",
  description: "生成每日站会更新模板，基于 Git 提交记录自动生成。",
  category: "productivity-tools",
  tags: ["standup", "daily", "scrum", "agile"],
  icon: "message-circle",
  runtime: "simple",
  featured: false
};

export default manifest;
