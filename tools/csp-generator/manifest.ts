import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csp-generator",
  name: "CSP Generator",
  description: "生成 Content-Security-Policy Header，并给出基础安全提示。",
  category: "security-tools",
  subCategory: "security",
  tags: ["csp", "security", "headers", "policy"],
  icon: "shield",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
