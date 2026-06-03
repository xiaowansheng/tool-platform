import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "string-obfuscator",
  name: "String Obfuscator",
  description: "混淆字符串（如密钥、IBAN、令牌），使其可分享和可识别而不泄露完整内容。",
  category: "text-tools",
  subCategory: "text-processing",
  tags: ["obfuscate", "mask", "redact", "secret", "share"],
  icon: "eye-off",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
