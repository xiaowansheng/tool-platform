import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "diff-studio",
  name: "Diff Studio",
  description: "一站式文本与配置差异对比工坊，支持文本行级 LCS 对比、结构化 JSON 双栏对比、.env 环境变量脱敏合并以及 Helm values.yaml 架构审计与对比。",
  category: "developer-tools",
  subCategory: "convert",
  tags: [
    "diff",
    "compare",
    "text",
    "json",
    "env",
    "helm",
    "yaml",
    "config",
    "values",
    "audit"
  ],
  icon: "git-compare",
  runtime: "simple",
  featured: true,
  permissions: []
};

export default manifest;
