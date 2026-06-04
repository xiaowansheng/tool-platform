import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-studio",
  name: "Color Studio",
  description: "一站式色彩工坊，提供颜色格式转换、取色面板、对比度无障碍检查、色盘/配色方案生成、图片颜色提取与渐变色生成器。",
  category: "design-tools",
  subCategory: "color",
  tags: ["color", "hex", "rgb", "hsl", "picker", "palette", "gradient", "extractor", "wcag", "contrast", "blindness"],
  icon: "palette",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
