import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "incident-timeline-generator",
  name: "Incident Timeline Generator",
  description: "把事件记录转换成事故时间线、状态更新和复盘草稿。",
  category: "ops",
  subCategory: "incident",
  tags: ["incident", "timeline", "postmortem", "sre"],
  icon: "list-checks",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
