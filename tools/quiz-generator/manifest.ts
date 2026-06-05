import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "quiz-generator",
  name: "Quiz Generator",
  description: "基于输入内容自动生成选择题/填空题/问答题。",
  category: "learning-tools",
  tags: ["quiz", "exam", "question", "test"],
  icon: "help-circle",
  runtime: "simple",
  featured: false
};

export default manifest;
