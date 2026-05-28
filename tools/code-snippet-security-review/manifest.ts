import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "code-snippet-security-review",
  name: "Code Snippet Security Review",
  description: "对代码片段生成安全审查报告，覆盖密钥、注入、弱加密、CORS、Cookie 和 TLS 配置。",
  category: "网络安全",
  subCategory: "trusted-development",
  tags: ["code review", "security", "snippet", "static analysis", "secure coding"],
  icon: "shield-check",
  runtime: "simple",
  featured: true
};

export default manifest;
