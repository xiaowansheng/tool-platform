import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "kubernetes-probe-builder",
  name: "Kubernetes Probe Builder",
  description: "生成 liveness、readiness、startup probes，并计算失败窗口、启动预算和常见误配置风险。",
  category: "ops-tools",
  subCategory: "kubernetes",
  tags: ["kubernetes", "probe", "liveness", "readiness", "startup"],
  icon: "heart-pulse",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["probe-yaml", "failure-window", "k8s-review"]
};

export default manifest;
