import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "spaced-repetition-planner",
  name: "Spaced Repetition Planner",
  description: "基于间隔重复算法生成学习计划，支持 SM-2 算法和自定义复习间隔。",
  category: "learning-tools",
  subCategory: "study",
  tags: ["spaced-repetition", "learning", "study", "sm-2", "flashcard", "schedule"],
  icon: "brain-circuit",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
