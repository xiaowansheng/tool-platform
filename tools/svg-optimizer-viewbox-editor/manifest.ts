import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "svg-optimizer-viewbox-editor",
  name: "SVG Optimizer / ViewBox Editor",
  description: "清理 SVG 标记、重写 viewBox，并即时预览优化后的矢量资产。",
  category: "design",
  subCategory: "asset",
  tags: ["svg", "optimizer", "viewbox", "icon", "vector"],
  icon: "scan",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
