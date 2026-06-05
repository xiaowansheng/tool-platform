import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "excel-formula-builder",
  name: "Excel Formula Builder",
  description: "可视化构建 Excel 公式，选择函数和参数并实时预览计算结果。",
  category: "data-tools",
  tags: ["excel", "formula", "spreadsheet"],
  icon: "function-square",
  runtime: "simple",
  featured: false
};

export default manifest;
