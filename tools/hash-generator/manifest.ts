import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "hash-generator",
  name: "Hash Generator",
  description: "使用 Web Crypto 生成 SHA 摘要，适合校验文本与配置片段。",
  category: "text-tools",
  subCategory: "crypto",
  tags: ["hash", "sha", "digest", "checksum"],
  icon: "hash",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["crypto"]
};

export default manifest;
