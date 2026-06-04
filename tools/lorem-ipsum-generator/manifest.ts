import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "lorem-ipsum-generator",
  name: "占位文本生成器",
  description: "生成占位标题、句子和段落，用于原型和视觉稿。",
  category: "text-tools",
  tags: ["lorem", "ipsum", "generator", "placeholder", "text"],
  icon: "align-left",
  runtime: "simple",
  featured: false
};

export default manifest;
