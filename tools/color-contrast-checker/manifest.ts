import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "color-contrast-checker",
  name: "Color Contrast WCAG Checker",
  description: "计算前景色与背景色对比度，并判断 WCAG AA / AAA 文本与 UI 合规性。",
  category: "设计工具",
  subCategory: "accessibility",
  tags: ["contrast", "wcag", "accessibility", "color", "a11y"],
  icon: "contrast",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
