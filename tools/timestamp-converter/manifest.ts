import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "timestamp-converter",
  name: "Timestamp Converter",
  description: "在 Unix 时间戳、ISO 字符串、RFC 2822 和本地时间之间双向换算，支持时区转换、相对时间、日历组件提取。",
  category: "calculator-tools",
  subCategory: "time",
  tags: ["timestamp", "unix", "iso", "date", "timezone", "rfc2822", "calendar", "epoch"],
  icon: "clock",
  runtime: "simple",
  featured: false
};

export default manifest;
