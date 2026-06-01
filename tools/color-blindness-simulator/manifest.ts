import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-blindness-simulator",
  name: "Color Blindness Simulator",
  description: "模拟不同色盲类型下的颜色显示效果，确保色彩无障碍设计。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "accessibility", "blindness", "a11y", "simulator"],
  icon: "eye-off",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
