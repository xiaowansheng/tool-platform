import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "meeting-cost-calculator",
  name: "会议成本计算器",
  description: "根据参会人数、平均时薪和会议时长，计算一次会议的总人力成本",
  category: "productivity-tools",
  subCategory: "team-management",
  tags: ["meeting", "cost", "productivity", "salary", "team"],
  icon: "users",
  runtime: "simple",
  featured: false
};

export default manifest;
