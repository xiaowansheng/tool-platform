import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-converter",
  name: "Color Converter",
  description: "转换 HEX、RGB 和 HSL，并预览颜色。",
  category: "design",
  subCategory: "color",
  tags: ["color", "hex", "rgb", "hsl"],
  icon: "palette",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
