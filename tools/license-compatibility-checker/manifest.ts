import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "license-compatibility-checker",
  name: "License Compatibility Checker",
  description: "按项目分发方式检查常见开源许可证组合的兼容性风险。",
  category: "developer",
  subCategory: "compliance",
  tags: ["license", "compliance", "oss", "legal", "dependencies"],
  icon: "scale",
  runtime: "simple",
  featured: false
};

export default manifest;
