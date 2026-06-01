import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-picker",
  name: "Color Picker",
  description: "通过色相、饱和度、明度面板选取并微调颜色，一键复制多格式值。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "picker", "hsl", "hex", "rgb", "design"],
  icon: "pipette",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
