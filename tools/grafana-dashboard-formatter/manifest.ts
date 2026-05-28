import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "grafana-dashboard-formatter",
  name: "Grafana Dashboard JSON Formatter",
  description: "格式化 Grafana dashboard JSON，提取 panel 清单并检查常见导入问题。",
  category: "ops-tools",
  subCategory: "observability",
  tags: ["grafana", "dashboard", "json", "formatter"],
  icon: "layout-dashboard",
  runtime: "simple",
  featured: false
};

export default manifest;
