import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "password-generator",
  name: "Password Generator",
  description: "使用浏览器 Crypto API 生成随机密码和口令片段。",
  category: "网络安全",
  subCategory: "security",
  tags: ["password", "security", "random", "crypto"],
  icon: "shield-keyhole",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
