import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "word-counter",
  name: "字数统计",
  description: "实时统计文本的字符数、字节数、单词数、行数、段落数，并估算中英文阅读时间。",
  category: "text-tools",
  subCategory: "analysis",
  tags: ["word-count", "字数", "字符", "统计", "reading-time"],
  icon: "file-text",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
