import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "batch-file-hash-calculator",
  name: "Batch File Hash Calculator",
  description: "批量计算文件 SHA 摘要，生成校验清单并导出 CSV。",
  category: "文件工具",
  subCategory: "checksum",
  tags: ["hash", "sha", "checksum", "files"],
  icon: "fingerprint",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard", "filesystem"],
  capabilities: ["crypto"]
};

export default manifest;
