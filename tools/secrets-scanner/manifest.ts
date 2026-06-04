import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "secrets-scanner",
  name: "密钥扫描器",
  description: "本地扫描文本、env 或 repo 片段中的常见密钥和高熵 Token。",
  category: "security-tools",
  tags: ["secrets", "scanner", "security", "token", "env"],
  icon: "shield-alert",
  runtime: "simple",
  featured: false
};

export default manifest;
