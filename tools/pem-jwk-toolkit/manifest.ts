import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pem-jwk-toolkit",
  name: "PEM JWK CSR Toolkit",
  description: "在 RSA 公钥 PEM 和 JWK 之间转换，并解析 CSR/PEM 基础信息。",
  category: "security-tools",
  subCategory: "security",
  tags: ["pem", "jwk", "csr", "rsa"],
  icon: "file-lock",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
