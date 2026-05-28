import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "tls-certificate-parser",
  name: "TLS Certificate Parser",
  description: "解析 PEM 证书的 DER 摘要、指纹和可读 ASN.1 字符串线索。",
  category: "network",
  subCategory: "tls",
  tags: ["tls", "certificate", "pem", "x509"],
  icon: "certificate",
  runtime: "simple",
  featured: false
};

export default manifest;
