"use client";

import { AiTrustWorkspace } from "@tool-platform/ai-trust-tools";
import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function AgentBehaviorLogViewerTool({ manifest }: ToolClientProps) {
  return <AiTrustWorkspace manifest={manifest} toolId="agent-behavior-log-viewer" />;
}
