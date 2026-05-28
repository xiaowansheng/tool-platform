import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "task-priority-matrix",
  name: "Task Priority Matrix",
  description: "用影响、紧急度、信心和工作量给任务打分，生成排序、象限和可复制执行清单。",
  category: "效率工具",
  subCategory: "planning",
  tags: ["priority", "planning", "matrix", "task", "productivity"],
  icon: "list-checks",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["priority-score", "eisenhower-matrix", "action-list"]
};

export default manifest;
