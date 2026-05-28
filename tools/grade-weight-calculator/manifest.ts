import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "grade-weight-calculator",
  name: "Grade Weight Calculator",
  description: "按作业、测验、期中和期末权重计算当前成绩，并估算达到目标分数所需的剩余成绩。",
  category: "计算工具",
  subCategory: "education",
  tags: ["grade", "weight", "calculator", "score", "education"],
  icon: "graduation-cap",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["weighted-average", "target-score", "remaining-weight"]
};

export default manifest;
