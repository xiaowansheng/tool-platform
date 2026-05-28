import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "easing-cubic-bezier-debugger",
  name: "Easing / Cubic Bezier Debugger",
  description: "调试 cubic-bezier 曲线、预览动画节奏，并复制 CSS easing token。",
  category: "design",
  subCategory: "motion",
  tags: ["easing", "cubic bezier", "animation", "css", "motion"],
  icon: "activity",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
