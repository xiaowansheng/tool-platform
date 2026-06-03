import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "hash-generator",
  name: "Hash Generator",
  description: "使用 Web Crypto 生成 SHA 摘要或 SRI integrity，适合校验文本、脚本和配置片段。",
  category: "text-tools",
  subCategory: "crypto",
  tags: ["hash", "sha", "digest", "checksum", "sri", "integrity"],
  icon: "hash",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
