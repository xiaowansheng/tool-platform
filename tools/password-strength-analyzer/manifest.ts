import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "password-strength-analyzer",
  name: "Password Strength Analyser",
  description: "客户端密码强度分析和破解时间估算，提供详细的改进建议。",
  category: "security-tools",
  subCategory: "authentication",
  tags: ["password", "strength", "entropy", "security", "crack-time"],
  icon: "shield-check",
  runtime: "simple",
  featured: false,
  permissions: []
};

export default manifest;
