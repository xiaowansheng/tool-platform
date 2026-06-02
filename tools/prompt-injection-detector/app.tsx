"use client";

import { AiTrustWorkspace } from "@tool-platform/ai-trust-tools";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function PromptInjectionDetectorTool({ manifest }: ToolAppProps) {
  return <AiTrustWorkspace manifest={manifest} toolId="prompt-injection-detector" />;
}
