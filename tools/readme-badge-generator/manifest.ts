import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "readme-badge-generator",
  name: "README Badge 生成器",
  description: "生成 shields.io Badge URL、Markdown 和 HTML 片段，适合 README 顶部状态区。",
  category: "office-tools",
  tags: ["readme", "badge", "shields", "markdown", "generator"],
  icon: "tag",
  runtime: "simple",
  featured: false
};

export default manifest;
