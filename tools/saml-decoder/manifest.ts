import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "saml-decoder",
  name: "SAML Decoder",
  description: "解码并解析 SAML Request/Response，提取断言、属性与签名信息。",
  category: "security-tools",
  tags: ["saml", "sso", "authentication", "xml"],
  icon: "fingerprint",
  runtime: "simple",
  featured: false
};

export default manifest;
