import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "helm-values-diff",
  name: "Helm Values Diff",
  description: "对比 Helm values 文件，列出新增、删除、变更和高风险配置项。",
  category: "ops-tools",
  subCategory: "kubernetes",
  tags: ["helm", "values", "yaml", "diff"],
  icon: "git-compare",
  runtime: "simple",
  featured: false
};

export default manifest;
