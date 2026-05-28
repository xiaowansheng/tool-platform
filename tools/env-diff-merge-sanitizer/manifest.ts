import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "env-diff-merge-sanitizer",
  name: ".env Diff / Merge / Sanitizer",
  description: "对比、合并并脱敏 .env 文件，生成安全的示例配置。",
  category: "developer-tools",
  subCategory: "config",
  tags: ["env", "dotenv", "diff", "sanitize"],
  icon: "file-key",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
