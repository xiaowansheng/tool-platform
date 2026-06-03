import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "placeholder-generator",
  name: "占位图片生成器",
  description: "快速生成自定义尺寸、文字内容、背景色及文字颜色的前端占位图片。支持直接导出/复制 SVG 代码、PNG 格式或 Base64 数据 URL。",
  category: "image-tools",
  tags: ["image", "placeholder", "mockup", "svg", "png", "dev-tool"],
  icon: "image",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
