import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "release-notes-builder",
  name: "Release Notes Builder",
  description: "把亮点、修复、破坏性变更和升级步骤整理成面向用户的发布说明。",
  category: "developer-tools",
  subCategory: "release",
  tags: ["release-notes", "changelog", "launch", "markdown"],
  icon: "newspaper",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
