import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "svg-playground",
  name: "SVG Playground",
  description: "在 iframe 沙箱中编辑 SVG 代码并实时预览，支持导出为独立 SVG 文件。",
  category: "design-tools",
  tags: ["svg", "sandbox", "preview", "vector"],
  icon: "move-3d",
  runtime: "sandbox",
  featured: false,
  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "svg-preview", "svg-export"],
  permissions: ["clipboard"]
};

export default manifest;
