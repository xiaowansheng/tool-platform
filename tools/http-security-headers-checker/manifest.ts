import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "http-security-headers-checker",
  name: "HTTP Security Headers Checker",
  description: "检查响应 Header 中 CSP、HSTS、XFO、Cookie Flags 等安全配置。",
  category: "network",
  subCategory: "security",
  tags: ["http", "headers", "csp", "hsts", "security"],
  icon: "shield-check",
  runtime: "simple",
  featured: false
};

export default manifest;
