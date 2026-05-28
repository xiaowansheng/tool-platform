import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "social-post-scheduler",
  name: "Social Post Scheduler",
  description: "为多平台社媒文案生成发布排期、字符数检查、标签建议和 CSV 日历草稿。",
  category: "social-tools",
  subCategory: "planning",
  tags: ["social", "calendar", "caption", "hashtag", "csv"],
  icon: "calendar-clock",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["platform-length", "posting-calendar", "csv-schedule"]
};

export default manifest;
