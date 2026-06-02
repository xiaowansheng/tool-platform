import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "live-event-countdown",
  name: "Live Event Countdown",
  description: "创建实时倒计时，支持多个事件、自定义标签和时间到期提醒。",
  category: "productivity-tools",
  subCategory: "time",
  tags: ["countdown", "timer", "event", "deadline", "reminder", "live"],
  icon: "timer",
  runtime: "simple",
  featured: false
};

export default manifest;
