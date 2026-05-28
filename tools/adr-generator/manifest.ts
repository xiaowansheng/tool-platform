import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "adr-generator",
  name: "ADR 生成器",
  description: "生成 Architecture Decision Record，覆盖背景、决策、备选方案和后果。",
  category: "developer",
  subCategory: "architecture",
  tags: ["adr", "architecture", "decision-record", "docs"],
  icon: "file-signature",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
