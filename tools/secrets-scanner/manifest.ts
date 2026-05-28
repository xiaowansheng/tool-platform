import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "secrets-scanner",
  name: "Secrets Scanner",
  description: "本地扫描文本、env 或 repo 片段中的常见密钥和高熵 Token。",
  category: "security-tools",
  subCategory: "security",
  tags: ["secrets", "scanner", "env", "security"],
  icon: "scan-search",
  runtime: "simple",
  featured: true
};

export default manifest;
