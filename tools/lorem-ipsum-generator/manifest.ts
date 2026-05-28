import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "lorem-ipsum-generator",
  name: "Lorem Ipsum Generator",
  description: "生成占位标题、句子和段落，用于原型和视觉稿。",
  category: "娱乐工具",
  subCategory: "content",
  tags: ["lorem", "placeholder", "copy", "prototype"],
  icon: "type",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
