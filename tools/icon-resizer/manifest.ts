import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "icon-resizer",
  name: "Icon Resizer",
  description: "图标批量调整大小与导出，支持 SVG/PNG 多分辨率输出。",
  category: "design-tools",
  tags: ["icon", "resize", "svg", "export"],
  icon: "crop",
  runtime: "simple",
  featured: false
};

export default manifest;
