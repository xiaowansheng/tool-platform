import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-diff",
  name: "JSON Diff and Compare",
  description: "JSON Diff and Compare workspace",
  category: "data-tools",
  tags: ["json", "diff", "compare"],
  icon: "file-code",
  runtime: "simple",
  featured: true
};

export default manifest;
