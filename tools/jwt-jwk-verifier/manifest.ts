import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "jwt-jwk-verifier",
  name: "JWT JWK Verifier",
  description: "解码 JWT，并用 HMAC secret 或 RSA JWK 验证 HS256 / RS256 签名。",
  category: "developer",
  subCategory: "security",
  tags: ["jwt", "jwk", "verify", "signature"],
  icon: "shield-check",
  runtime: "simple",
  featured: true
};

export default manifest;
