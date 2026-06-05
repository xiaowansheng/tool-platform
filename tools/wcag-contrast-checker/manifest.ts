import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "wcag-contrast-checker",
  name: "WCAG Contrast Checker",
  description: "WCAG 2.2 AA/AAA 色彩对比度检查器，支持取色器与实时预览。",
  category: "design-tools",
  tags: ["wcag", "contrast", "accessibility", "a11y"],
  icon: "eye",
  runtime: "simple",
  featured: false
};

export default manifest;
