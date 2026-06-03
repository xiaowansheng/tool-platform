import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "time-calculator",
  name: "时间计算与倒计时",
  description: "时间计算与倒计时 workspace",
  category: "计算工具",
  tags: ["time-calculator"],
  icon: "sparkles",
  runtime: "simple",
  featured: false
};

export default manifest;
