import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "kubernetes-yaml-validator",
  name: "Kubernetes YAML 校验器",
  description: "检查 Kubernetes manifest 的必填字段、镜像标签、资源限制和探针配置。",
  category: "ops-tools",
  subCategory: "kubernetes",
  tags: ["kubernetes", "yaml", "k8s", "validator"],
  icon: "ship-wheel",
  runtime: "simple",
  featured: false
};

export default manifest;
