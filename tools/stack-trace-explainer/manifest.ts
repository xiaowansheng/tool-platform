import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "stack-trace-explainer",
  name: "Stack Trace Explainer",
  description: "解释 JS、Python、Java 等堆栈，定位异常类型、应用代码帧和下一步调试动作。",
  category: "ai-tools",
  subCategory: "trusted-development",
  tags: ["stack trace", "exception", "debugging", "error", "explain"],
  icon: "file-stack",
  runtime: "simple",
  featured: false
};

export default manifest;
