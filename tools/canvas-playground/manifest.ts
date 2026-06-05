import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "canvas-playground",
  name: "Canvas Playground",
  description: "在 iframe 沙箱中编写 Canvas 2D 绘图代码，实时查看渲染效果与性能帧率。",
  category: "design-tools",
  tags: ["canvas", "2d", "drawing", "sandbox"],
  icon: "pencil",
  runtime: "sandbox",
  featured: false,
  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "canvas-2d"],
  permissions: ["clipboard"]
};

export default manifest;
