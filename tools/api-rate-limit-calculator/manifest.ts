import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "api-rate-limit-calculator",
  name: "API Rate Limit Calculator",
  description: "按用户数、峰值倍数和时间窗口计算限流阈值、burst、Retry-After，并生成网关配置草稿。",
  category: "开发工具",
  subCategory: "api",
  tags: ["api", "rate-limit", "quota", "backend", "gateway"],
  icon: "gauge",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["quota-math", "gateway-snippet", "retry-after"]
};

export default manifest;
