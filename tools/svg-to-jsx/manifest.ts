import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "svg-to-jsx",
  name: "SVG 转 JSX 转换器",
  description: "SVG 转 JSX 转换器 workspace",
  category: "开发工具",
  tags: ["svg-to-jsx"],
  icon: "sparkles",
  runtime: "simple",
  featured: false
};

export default manifest;
