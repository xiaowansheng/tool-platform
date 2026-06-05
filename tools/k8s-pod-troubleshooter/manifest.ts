import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "k8s-pod-troubleshooter",
  name: "K8s Pod Troubleshooter",
  description: "Kubernetes Pod 故障排查引导，交互式诊断 CrashLoopBackOff 等常见问题。",
  category: "ops-tools",
  tags: ["kubernetes", "pod", "troubleshoot", "diagnosis"],
  icon: "bug",
  runtime: "simple",
  featured: false
};

export default manifest;
