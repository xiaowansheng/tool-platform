import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "bug-report-repro-steps-generator",
  name: "Bug Report to Repro Steps Generator",
  description: "把 Bug Report 整理成可执行复现步骤、前置条件、期望结果、实际结果和证据清单。",
  category: "ai",
  subCategory: "trusted-development",
  tags: ["bug report", "repro steps", "triage", "qa", "debugging"],
  icon: "bug",
  runtime: "simple",
  featured: false
};

export default manifest;
