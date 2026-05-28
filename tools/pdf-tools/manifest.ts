import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pdf-tools",
  name: "PDF Tools",
  description: "本地合并、拆分和无损整理压缩 PDF，适合快速处理常见未加密 PDF。",
  category: "file-tools",
  subCategory: "document",
  tags: ["pdf", "merge", "split", "compress", "document"],
  icon: "files",
  runtime: "simple",
  featured: true,
  permissions: ["filesystem"]
};

export default manifest;
