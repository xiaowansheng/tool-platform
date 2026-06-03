import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "text-cipher",
  name: "Encrypt / Decrypt Text",
  description: "使用 AES-GCM、AES-CTR 等算法加密明文和解密密文，支持自定义密钥和 IV。",
  category: "security-tools",
  subCategory: "crypto",
  tags: ["encrypt", "decrypt", "aes", "cipher", "crypto"],
  icon: "lock",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
