import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-color-picker",
  name: "CSS Color Picker",
  description: "从多种颜色盘中选取颜色，切换 HEX/RGB/HSL/RGBA/HSLA 格式，浏览 CSS 命名色、Flat UI、语义色、Tailwind 等常用色板并一键复制。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "picker", "css", "palette", "hex", "rgb", "hsl", "named-colors", "flat-ui", "tailwind"],
  icon: "palette",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
