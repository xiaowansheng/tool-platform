import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "regex-tester",
  name: "Regex Tester",
  description: "实时测试正则表达式并查看匹配结果。",
  category: "developer",
  subCategory: "debugging",
  tags: ["regex", "matching", "debugging"],
  icon: "scan-search",
  runtime: "simple",
  featured: true
};

export default manifest;
