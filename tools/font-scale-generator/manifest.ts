import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "font-scale-generator",
  name: "Font Scale Generator",
  description: "生成静态字号比例或响应式 clamp() 排版 scale、CSS token 和预览样张。",
  category: "design-tools",
  subCategory: "typography",
  tags: ["typography", "font scale", "type scale", "css tokens", "design system", "clamp", "fluid", "responsive"],
  icon: "case-sensitive",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
