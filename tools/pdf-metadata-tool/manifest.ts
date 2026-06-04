import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pdf-metadata-tool",
  name: "PDF 元数据工具",
  description: "查看 PDF Info 字典和 XMP 元数据，并生成保留字节偏移的清理版本。",
  category: "file-tools",
  tags: ["pdf", "metadata", "xmp", "cleaner", "info"],
  icon: "file-text",
  runtime: "simple",
  featured: false
};

export default manifest;
