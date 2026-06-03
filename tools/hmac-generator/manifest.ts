import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "hmac-generator",
  name: "HMAC Generator",
  description: "使用密钥和哈希函数计算基于哈希的消息认证码（HMAC），支持 SHA-1/256/384/512。",
  category: "security-tools",
  subCategory: "crypto",
  tags: ["hmac", "mac", "authentication", "hash", "crypto"],
  icon: "key",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
