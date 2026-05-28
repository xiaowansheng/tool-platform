import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "css-specificity-calculator",
  name: "CSS Specificity Calculator",
  description: "计算 CSS 选择器权重，拆分 ID、class/属性/伪类和元素/伪元素分数。",
  category: "设计工具",
  subCategory: "css",
  tags: ["css", "specificity", "selector", "cascade"],
  icon: "target",
  runtime: "simple",
  featured: false
};

export default manifest;
