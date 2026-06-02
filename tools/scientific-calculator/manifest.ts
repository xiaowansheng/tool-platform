import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "scientific-calculator",
  name: "Scientific Calculator",
  description: "支持代数、三角函数、指数对数、内存寄存器及历史记录的科学计算器。",
  category: "calculator-tools",
  subCategory: "calculator",
  tags: ["calculator", "math", "scientific", "trigonometry"],
  icon: "calculator",
  runtime: "simple",
  featured: true
};

export default manifest;
