import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "file-name-batch-renamer",
  name: "File Name Batch Renamer",
  description: "粘贴文件名清单，预览批量重命名结果，并生成安全的 dry-run shell 命令。",
  category: "文件工具",
  subCategory: "batch",
  tags: ["file", "rename", "batch", "slug", "shell"],
  icon: "file-pen-line",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["rename-preview", "slug-case", "dry-run-script"]
};

export default manifest;
