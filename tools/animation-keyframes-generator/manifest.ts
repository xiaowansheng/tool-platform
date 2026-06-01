import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "animation-keyframes-generator",
  name: "Animation Keyframes Generator",
  description: "可视化编辑 CSS @keyframes 动画，设置关键帧与动画属性，生成可复制代码。",
  category: "design-tools",
  subCategory: "motion",
  tags: ["animation", "keyframes", "css", "motion", "visual"],
  icon: "play-circle",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
