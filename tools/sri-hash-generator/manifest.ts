import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sri-hash-generator",
  name: "SRI Hash Generator",
  description: "为脚本或样式内容生成 Subresource Integrity sha256/384/512。",
  category: "网络安全",
  subCategory: "security",
  tags: ["sri", "hash", "integrity", "security"],
  icon: "fingerprint",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
