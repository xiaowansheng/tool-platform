import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "time-calculator",
  name: "时间计算与倒计时",
  description: "计算两个时间点之间的间隔、设置实时倒计时、对时间进行加减运算",
  category: "calculator-tools",
  subCategory: "date-time",
  tags: ["time", "countdown", "interval", "date"],
  icon: "clock",
  runtime: "simple",
  featured: false
};

export default manifest;
