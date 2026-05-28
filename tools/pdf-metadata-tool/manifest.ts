import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pdf-metadata-tool",
  name: "PDF Metadata Tool",
  description: "查看 PDF Info 字典和 XMP 元数据，并生成保留字节偏移的清理版本。",
  category: "file",
  subCategory: "metadata",
  tags: ["pdf", "metadata", "xmp", "privacy"],
  icon: "file-key",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem"]
};

export default manifest;
