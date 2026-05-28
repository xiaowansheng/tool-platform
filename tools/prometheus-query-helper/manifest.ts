import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "prometheus-query-helper",
  name: "Prometheus Query Helper",
  description: "按常见监控场景生成 PromQL，并提示窗口、标签和告警规则风险。",
  category: "运维工具",
  subCategory: "observability",
  tags: ["prometheus", "promql", "metrics", "alerting"],
  icon: "activity",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
