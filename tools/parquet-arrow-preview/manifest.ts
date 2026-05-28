import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "parquet-arrow-preview",
  name: "Parquet Arrow Preview",
  description: "预览 Parquet、Arrow IPC 与 Feather 文件的格式标记、页脚和字节结构。",
  category: "file",
  subCategory: "data",
  tags: ["parquet", "arrow", "feather", "preview"],
  icon: "database",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem"]
};

export default manifest;
