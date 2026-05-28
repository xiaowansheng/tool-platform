import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "agent-behavior-log-viewer",
  name: "Agent Behavior Log Viewer",
  description: "查看 Agent 行为日志，汇总工具调用、审批边界、失败恢复和潜在破坏性动作。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["agent", "logs", "audit", "tool calls", "behavior"],
  icon: "activity",
  runtime: "simple",
  featured: false
};

export default manifest;
