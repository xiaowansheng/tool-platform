import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "date-difference-calculator",
  name: "日期差计算器",
  description: "计算两个日期之间的天数、周数、月数差异，支持包含/排除起止日",
  category: "calculator-tools",
  subCategory: "date-time",
  tags: ["date", "difference", "days", "calendar", "interval"],
  icon: "calendar",
  runtime: "simple",
  featured: false
};

export default manifest;
