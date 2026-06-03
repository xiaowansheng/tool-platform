import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "benchmark-builder",
  name: "Benchmark Builder",
  description: "简单的在线基准测试构建器，轻松比较 JavaScript 代码片段的执行时间。",
  category: "developer-tools",
  subCategory: "testing",
  tags: ["benchmark", "performance", "timing", "speed-test", "compare"],
  icon: "gauge",
  runtime: "simple",
  featured: false,
  permissions: []
};

export default manifest;
