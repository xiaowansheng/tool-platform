import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "oauth-oidc-debugger",
  name: "OAuth OIDC Debugger",
  description: "解析授权 URL、OIDC ID Token，并生成 PKCE challenge。",
  category: "developer-tools",
  subCategory: "security",
  tags: ["oauth", "oidc", "pkce", "token"],
  icon: "key-square",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
