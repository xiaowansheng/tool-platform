import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "slo-error-budget-calculator",
  name: "SLO Error Budget Calculator",
  description: "按 SLO、周期、请求量和事故分钟数计算错误预算、消耗率、剩余预算和发布风险。",
  category: "ops-tools",
  subCategory: "reliability",
  tags: ["slo", "sli", "error-budget", "reliability", "incident"],
  icon: "activity",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["slo-math", "burn-rate", "incident-summary"]
};

export default manifest;
