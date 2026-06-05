import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "semver-calculator",
  name: "SemVer Calculator",
  description: "语义化版本号比较、递增、范围校验与排序。",
  category: "developer-tools",
  tags: ["semver", "version", "compare", "bump"],
  icon: "git-compare",
  runtime: "simple",
  featured: false
};

export default manifest;
