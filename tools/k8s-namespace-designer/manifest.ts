import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "k8s-namespace-designer",
  name: "K8s Namespace Designer",
  description: "可视化设计 Kubernetes Namespace 资源配额与 LimitRange。",
  category: "ops-tools",
  tags: ["kubernetes", "namespace", "resource-quota", "limit-range"],
  icon: "container",
  runtime: "simple",
  featured: false
};

export default manifest;
