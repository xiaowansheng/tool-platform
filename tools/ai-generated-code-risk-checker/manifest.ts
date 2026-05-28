import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ai-generated-code-risk-checker",
  name: "AI Generated Code Risk Checker",
  description: "扫描 AI 生成代码里的占位符、注入面、鉴权绕过、密钥和静默失败风险。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["ai code", "risk", "security", "review", "generated code"],
  icon: "shield-alert",
  runtime: "simple",
  featured: true
};

export default manifest;
