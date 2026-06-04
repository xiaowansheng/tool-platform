import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "spaced-repetition-planner",
  name: "间隔重复学习计划器",
  description: "基于间隔重复算法生成学习计划，支持 SM-2 算法和自定义复习间隔。",
  category: "learning-tools",
  tags: ["study", "plan", "spaced-repetition", "sm2", "schedule"],
  icon: "calendar",
  runtime: "simple",
  featured: false
};

export default manifest;
