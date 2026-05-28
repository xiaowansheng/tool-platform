import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "test-case-generator",
  name: "Test Case Generator",
  description: "根据需求、验收标准或代码说明生成 happy path、边界、负向、权限和回归测试用例。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["testing", "test cases", "qa", "acceptance", "coverage"],
  icon: "clipboard-check",
  runtime: "simple",
  featured: false
};

export default manifest;
