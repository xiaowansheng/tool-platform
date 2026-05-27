import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "jwt-decoder",
  name: "JWT Decoder",
  description: "本地解码 JWT header 与 payload，并标记常见时间声明。",
  category: "developer",
  subCategory: "security",
  tags: ["jwt", "token", "auth", "base64url"],
  icon: "key-round",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
