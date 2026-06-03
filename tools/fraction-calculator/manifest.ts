import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "fraction-calculator",
  name: "分数计算器",
  description: "对分数进行加减乘除运算，自动约分并显示计算步骤。",
  category: "calculator-tools",
  subCategory: "number",
  tags: ["fraction", "分数", "math", "gcd", "calculator"],
  icon: "divide",
  runtime: "simple",
  featured: false
};

export default manifest;
