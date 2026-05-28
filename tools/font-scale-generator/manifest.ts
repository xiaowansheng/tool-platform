import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "font-scale-generator",
  name: "Font Scale Generator",
  description: "基于基础字号和比例生成排版 scale、CSS token 和预览样张。",
  category: "design",
  subCategory: "typography",
  tags: ["typography", "font scale", "type scale", "css tokens", "design system"],
  icon: "case-sensitive",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
