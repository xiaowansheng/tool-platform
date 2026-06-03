import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "otp-generator",
  name: "OTP Code Generator",
  description: "生成和验证基于时间的 OTP（TOTP）一次性密码，适用于多因素认证（MFA/2FA）。",
  category: "security-tools",
  subCategory: "authentication",
  tags: ["otp", "totp", "2fa", "mfa", "authenticator"],
  icon: "shield",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
