import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "code-complexity-analyzer",
  name: "Code Complexity Analyzer",
  description: "分析代码圈复杂度与认知复杂度，识别高复杂度函数。",
  category: "developer-tools",
  tags: ["complexity", "cyclomatic", "metrics"],
  icon: "bar-chart-3",
  runtime: "simple",
  featured: false
};

export default manifest;
