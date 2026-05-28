import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "percentage-calculator",
  name: "Percentage Calculator",
  description: "计算百分比、增减幅和 A 相对 B 的占比。",
  category: "计算工具",
  subCategory: "calculator",
  tags: ["percentage", "calculator", "growth", "ratio"],
  icon: "percent",
  runtime: "simple",
  featured: false
};

export default manifest;
