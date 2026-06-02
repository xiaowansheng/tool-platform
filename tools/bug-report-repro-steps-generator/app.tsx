"use client";

import { AiTrustWorkspace } from "@tool-platform/ai-trust-tools";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function BugReportReproStepsGeneratorTool({ manifest }: ToolAppProps) {
  return <AiTrustWorkspace manifest={manifest} toolId="bug-report-repro-steps-generator" />;
}
