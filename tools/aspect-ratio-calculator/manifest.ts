import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "aspect-ratio-calculator",
  name: "Aspect Ratio Calculator",
  description: "根据宽高计算比例，并按目标宽度或高度等比缩放。",
  category: "design-tools",
  subCategory: "layout",
  tags: ["aspect-ratio", "image", "layout", "calculator"],
  icon: "rectangle-horizontal",
  runtime: "simple",
  featured: false
};

export default manifest;
