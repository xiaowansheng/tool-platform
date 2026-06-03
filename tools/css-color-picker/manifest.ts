import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-color-picker",
  name: "CSS Color Picker",
  description: "从色板中取色或浏览 CSS 命名色、Flat UI、语义色、Tailwind 等常用色板；支持 HEX/RGB/HSL/RGBA/HSLA 多格式复制与搜索过滤。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "picker", "css", "palette", "hex", "rgb", "hsl", "named-colors", "flat-ui", "tailwind", "search"],
  icon: "palette",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
