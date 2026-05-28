import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "archive-structure-viewer",
  name: "Archive Structure Viewer",
  description: "读取 ZIP 与 TAR 的目录结构、文件大小、压缩方式和层级摘要。",
  category: "文件工具",
  subCategory: "archive",
  tags: ["zip", "tar", "archive", "tree"],
  icon: "archive",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem"]
};

export default manifest;
