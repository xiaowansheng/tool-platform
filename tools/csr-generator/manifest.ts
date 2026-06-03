import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csr-generator",
  name: "CSR 证书生成器",
  description: "在浏览器本地生成 PKCS#10 证书签名请求（CSR），支持 RSA 和 ECDSA 密钥对。",
  category: "security-tools",
  subCategory: "crypto",
  tags: ["csr", "certificate", "ssl", "tls", "pkcs10", "rsa", "ecdsa"],
  icon: "shield-check",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
