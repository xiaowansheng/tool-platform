import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "large-text-tools",
  name: "Large Text Tools",
  description: "对大文本执行分割、合并、按行去重和块级去重，适合日志与批量文本整理。",
  category: "text-tools",
  subCategory: "bulk",
  tags: ["text", "split", "merge", "dedupe", "large"],
  icon: "file-stack",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard", "filesystem"]
};

export default manifest;
