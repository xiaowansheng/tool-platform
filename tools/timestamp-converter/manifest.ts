import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "timestamp-converter",
  name: "Timestamp Converter",
  description: "在 Unix 时间戳、ISO 字符串和本地时间之间转换。",
  category: "calculator-tools",
  subCategory: "time",
  tags: ["timestamp", "unix", "iso", "date"],
  icon: "clock",
  runtime: "simple",
  featured: false
};

export default manifest;
