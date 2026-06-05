import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csp-evaluator",
  name: "CSP Evaluator",
  description: "输入 Content-Security-Policy 策略，分析安全风险与潜在绕过路径。",
  category: "security-tools",
  tags: ["csp", "content-security-policy", "security", "headers"],
  icon: "shield-alert",
  runtime: "simple",
  featured: false
};

export default manifest;
