import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "cvss-calculator",
  name: "CVSS Calculator",
  description: "计算 CVSS v3.1 Base Score、严重级别和标准 Vector 字符串。",
  category: "网络安全",
  subCategory: "security",
  tags: ["cvss", "vulnerability", "security", "risk"],
  icon: "gauge",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
