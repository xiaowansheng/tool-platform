import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "dependency-risk-explainer",
  name: "Dependency Risk Explainer",
  description: "从依赖清单中提取维护、版本、安全和供应链风险信号。",
  category: "security-tools",
  subCategory: "security",
  tags: ["dependencies", "supply-chain", "risk", "npm", "package"],
  icon: "shield-alert",
  runtime: "simple",
  featured: false
};

export default manifest;
