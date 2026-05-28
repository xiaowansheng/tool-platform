import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "error-log-troubleshooting-path-generator",
  name: "Error Log Troubleshooting Path Generator",
  description: "从错误日志中提取 5xx、超时、数据库、权限和资源耗尽信号，并生成排查路径。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["error log", "troubleshooting", "incident", "debugging", "observability"],
  icon: "route",
  runtime: "simple",
  featured: false
};

export default manifest;
