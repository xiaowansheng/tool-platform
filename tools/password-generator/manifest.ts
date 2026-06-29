import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "password-generator",
  name: "Password Generator Studio",
  description: "使用浏览器密码学安全随机数生成器本地生成随机密码，支持批量生成、一键剔除易混淆字符以及熵值安全性评估评估。",
  category: "security-tools",
  subCategory: "security",
  tags: ["password", "security", "random", "crypto", "batch"],
  icon: "shield-keyhole",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
