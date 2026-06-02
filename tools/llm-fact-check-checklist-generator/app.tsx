"use client";

import { AiTrustWorkspace } from "@tool-platform/ai-trust-tools";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function LlmFactCheckChecklistGeneratorTool({ manifest }: ToolAppProps) {
  return <AiTrustWorkspace manifest={manifest} toolId="llm-fact-check-checklist-generator" />;
}
