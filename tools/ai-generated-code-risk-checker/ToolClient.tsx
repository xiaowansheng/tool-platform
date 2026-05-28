"use client";

import { AiTrustWorkspace } from "@tool-platform/ai-trust-tools";
import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function AiGeneratedCodeRiskCheckerTool({ manifest }: ToolClientProps) {
  return <AiTrustWorkspace manifest={manifest} toolId="ai-generated-code-risk-checker" />;
}
