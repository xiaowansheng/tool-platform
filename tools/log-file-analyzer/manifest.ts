import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "log-file-analyzer",
  name: "Log File Analyzer",
  description: "统计日志级别、时间分布、错误样本、状态码和高频词，辅助快速定位异常。",
  category: "运维工具",
  subCategory: "logs",
  tags: ["log", "analyzer", "errors", "ops"],
  icon: "file-search",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard", "filesystem"]
};

export default manifest;
