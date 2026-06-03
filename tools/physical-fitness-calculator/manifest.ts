import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "physical-fitness-calculator",
  name: "体测分数计算器",
  description: "根据《国家学生体质健康标准》计算各年级各项体测分数、BMI、等级与建议。",
  category: "calculator-tools",
  tags: ["fitness", "health", "calculator", "body"],
  icon: "activity",
  runtime: "simple",
  featured: true
};

export default manifest;
