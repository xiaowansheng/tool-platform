import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "world-clock",
  name: "世界时钟",
  description: "实时显示全球多个时区的当前时间，支持自定义时区和夏令时对照",
  category: "productivity-tools",
  subCategory: "time-management",
  tags: ["clock", "timezone", "world", "time", "utc"],
  icon: "globe",
  runtime: "simple",
  featured: false
};

export default manifest;
