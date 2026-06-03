import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "file-size-converter",
  name: "文件大小换算器",
  description: "在 B、KB、MB、GB、TB、PB 之间快速换算，支持二进制 (1024) 和十进制 (1000) 两种标准",
  category: "file-tools",
  subCategory: "file-management",
  tags: ["file", "size", "bytes", "converter", "storage"],
  icon: "hard-drive",
  runtime: "simple",
  featured: false
};

export default manifest;
